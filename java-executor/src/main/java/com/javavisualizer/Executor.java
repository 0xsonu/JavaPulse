package com.javavisualizer;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import org.apache.commons.io.FileUtils;
import org.objectweb.asm.*;

import javax.tools.*;
import java.io.*;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.*;
import java.security.Permission;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

public class Executor {
    private final KafkaProducer<String, String> producer;
    private final KafkaConsumer<String, String> consumer;
    private final ObjectMapper objectMapper;
    private final ExecutorService threadPool;
    private final Path tempDir;
    private final AtomicBoolean running;
    private int stepNumber = 0;

    private static final String TEMP_DIR = System.getenv().getOrDefault("TEMP_DIR", "/app/tmp");
    private static final int MAX_CONCURRENT_EXECUTIONS = 5;

    public Executor() {
        Properties producerProps = new Properties();
        Properties consumerProps = new Properties();

        String bootstrapServers = System.getenv().getOrDefault("KAFKA_BROKERS", "localhost:9092");
        
        producerProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        producerProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");

        consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, "java-executor");
        consumerProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");

        this.producer = new KafkaProducer<>(producerProps);
        this.consumer = new KafkaConsumer<>(consumerProps);
        
        this.objectMapper = new ObjectMapper().findAndRegisterModules();
        this.threadPool = Executors.newFixedThreadPool(MAX_CONCURRENT_EXECUTIONS);
        this.tempDir = Paths.get(TEMP_DIR);
        this.running = new AtomicBoolean(true);
        initializeTempDirectory();
    }

    private void initializeTempDirectory() {
        try {
            Files.createDirectories(tempDir);
            Runtime.getRuntime().addShutdownHook(new Thread(this::cleanup));
        } catch (IOException e) {
            throw new RuntimeException("Failed to initialize temp directory", e);
        }
    }

    public void start() {
        new Thread(this::consumeMessages).start();
    }

    private void consumeMessages() {
        try {
            consumer.subscribe(Collections.singletonList("java-code"));
            
            while (running.get()) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
                
                for (ConsumerRecord<String, String> record : records) {
                    threadPool.submit(() -> processRecord(record));
                }
                
                consumer.commitSync();
            }
        } catch (Exception e) {
            sendError(e, "CONSUMER_ERROR");
        } finally {
            consumer.close();
        }
    }

    @SuppressWarnings("unchecked")
    private void processRecord(ConsumerRecord<String, String> record) {
        try {
            Map<String, Object> codeData = objectMapper.readValue(record.value(), Map.class);
            String code = (String) codeData.get("code");
            String sessionId = (String) codeData.getOrDefault("sessionId", UUID.randomUUID().toString());
            
            executeCode(sessionId, code);
        } catch (Exception e) {
            sendError(e, "PROCESSING_ERROR");
        }
    }

    private void executeCode(String sessionId, String code) {
        stepNumber = 0;
        Path sourcePath = null;
        Path classPath = null;
        
        try {
            Path sessionDir = createSessionDirectory(sessionId);
            sourcePath = sessionDir.resolve("Main.java");
            classPath = sessionDir.resolve("Main.class");
            
            Files.writeString(sourcePath, code);
            
            compileCode(sourcePath);
            
            if (!Files.exists(classPath)) {
                throw new RuntimeException("Compiled class file not found");
            }
            
            byte[] instrumentedBytecode = instrumentClass(Files.readAllBytes(classPath));
            executeInstrumentedClass(sessionId, instrumentedBytecode, sessionDir);
            
        } catch (Exception e) {
            sendError(e, "EXECUTION_ERROR");
        } finally {
            cleanupSession(sourcePath);
        }
    }

    private void compileCode(Path sourcePath) throws IOException {
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            throw new RuntimeException("Java compiler not available. Make sure JDK is installed, not just JRE.");
        }
        
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        
        try (StandardJavaFileManager fileManager = compiler.getStandardFileManager(diagnostics, null, null)) {
            Iterable<? extends JavaFileObject> compilationUnits = 
                fileManager.getJavaFileObjects(sourcePath.toFile());

            JavaCompiler.CompilationTask task = compiler.getTask(
                null, fileManager, diagnostics, 
                null, compilationUnits);

            if (!task.call()) {
                StringBuilder errors = new StringBuilder("Compilation failed:\n");
                for (Diagnostic<? extends JavaFileObject> diagnostic : diagnostics.getDiagnostics()) {
                    errors.append(diagnostic.toString()).append("\n");
                }
                throw new RuntimeException(errors.toString());
            }
        }
    }

    private void verifyClassFile(Path classPath) throws IOException {
        if (!Files.exists(classPath)) {
            throw new IOException("Compiled class file not found at: " + classPath);
        }
        
        if (Files.size(classPath) == 0) {
            throw new IOException("Compiled class file is empty");
        }
    }

    private byte[] instrumentClass(byte[] originalBytecode) {
        ClassReader reader = new ClassReader(originalBytecode);
        ClassWriter writer = new ClassWriter(reader, ClassWriter.COMPUTE_FRAMES);
        reader.accept(new ClassInstrumentor(writer), 0);
        return writer.toByteArray();
    }

    private static class ClassInstrumentor extends ClassVisitor {
        public ClassInstrumentor(ClassVisitor cv) {
            super(Opcodes.ASM9, cv);
        }

        @Override
        public MethodVisitor visitMethod(int access, String name, String desc, 
                                        String signature, String[] exceptions) {
            MethodVisitor mv = super.visitMethod(access, name, desc, signature, exceptions);
            return new MethodInstrumentor(mv, name);
        }
    }

    private static class MethodInstrumentor extends MethodVisitor {
        private final String methodName;

        public MethodInstrumentor(MethodVisitor mv, String methodName) {
            super(Opcodes.ASM9, mv);
            this.methodName = methodName;
        }

        @Override
        public void visitCode() {
            super.visitCode();
        }
    }

    @SuppressWarnings("removal")
    private void executeInstrumentedClass(String sessionId, byte[] bytecode, Path classDir) throws Exception {
        try (URLClassLoader classLoader = new URLClassLoader(new URL[]{classDir.toUri().toURL()})) {
            Class<?> mainClass = classLoader.loadClass("Main");
            
            Method mainMethod = mainClass.getMethod("main", String[].class);
            
            ExecutorService executor = Executors.newSingleThreadExecutor();
            Future<?> future = executor.submit(() -> {
                try {
                    mainMethod.invoke(null, (Object) new String[]{});
                } catch (Exception e) {
                    throw new RuntimeException("Execution failed", e);
                }
            });

            try {
                future.get(5, TimeUnit.SECONDS);
            } catch (TimeoutException e) {
                future.cancel(true);
                throw new RuntimeException("Execution timed out", e);
            } finally {
                executor.shutdownNow();
            }
        }
    }

    private void sendExecutionStep(String sessionId, String description, 
                                  Map<String, Object> memoryState) {
        try {
            Map<String, Object> step = new LinkedHashMap<>();
            step.put("sessionId", sessionId);
            step.put("stepNumber", stepNumber++);
            step.put("timestamp", Instant.now().toString());
            step.put("description", description);
            step.put("memoryState", memoryState);
            
            producer.send(new ProducerRecord<>("java-execution", objectMapper.writeValueAsString(step)));
        } catch (Exception e) {
            sendError(e, "REPORTING_ERROR");
        }
    }

    private void sendError(Exception e, String errorCode) {
        try {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("type", "error");
            error.put("code", errorCode);
            error.put("message", e.getMessage());
            error.put("timestamp", Instant.now().toString());
            error.put("stackTrace", Arrays.stream(e.getStackTrace())
                    .map(StackTraceElement::toString)
                    .collect(Collectors.toList()));
            
            producer.send(new ProducerRecord<>("java-execution", objectMapper.writeValueAsString(error)));
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    private Path createSessionDirectory(String sessionId) throws IOException {
        Path dir = tempDir.resolve(sessionId);
        Files.createDirectories(dir);
        return dir;
    }

    private void cleanupSession(Path sourcePath) {
        try {
            if (sourcePath != null) {
                Files.deleteIfExists(sourcePath);
                Files.deleteIfExists(sourcePath.resolveSibling("Main.class"));
            }
        } catch (IOException e) {
            System.err.println("Failed to clean up session files: " + e.getMessage());
        }
    }

    private void cleanup() {
        try {
            running.set(false);
            threadPool.shutdown();
            if (!threadPool.awaitTermination(5, TimeUnit.SECONDS)) {
                threadPool.shutdownNow();
            }
            producer.close(Duration.ofSeconds(5));
            FileUtils.deleteDirectory(tempDir.toFile());
        } catch (Exception e) {
            System.err.println("Shutdown error: " + e.getMessage());
        }
    }

    public static void main(String[] args) {
        Executor executor = new Executor();
        executor.start();
        
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            executor.cleanup();
            System.out.println("Executor shutdown complete");
        }));
    }
}