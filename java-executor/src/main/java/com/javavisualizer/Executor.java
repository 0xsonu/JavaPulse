package com.javavisualizer;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;

import java.io.File;
import java.nio.file.Files;
import java.util.*;
import javax.tools.*;
import java.net.URLClassLoader;

public class Executor {
    private final KafkaProducer<String, String> producer;
    private final KafkaConsumer<String, String> consumer;
    private final ObjectMapper objectMapper;
    private int stepNumber = 0;

    public Executor() {
        Properties props = new Properties();
        props.put("bootstrap.servers", System.getenv("KAFKA_BROKERS"));
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("group.id", "java-executor");

        this.producer = new KafkaProducer<>(props);
        this.consumer = new KafkaConsumer<>(props);
        this.objectMapper = new ObjectMapper();
    }

    public void start() {
        consumer.subscribe(Collections.singletonList("java-code"));

        while (true) {
            var records = consumer.poll(java.time.Duration.ofMillis(100));
            
            for (var record : records) {
                try {
                    executeCode(record.value());
                } catch (Exception e) {
                    sendError(e);
                }
            }
        }
    }

    private void executeCode(String codeJson) throws Exception {
        // Reset step counter
        stepNumber = 0;

        // Parse incoming code
        var codeData = objectMapper.readTree(codeJson);
        String code = codeData.get("code").asText();

        // Create temporary directory for compilation
        File tmpDir = new File("/app/tmp");
        tmpDir.mkdirs();

        // Write source file
        File sourceFile = new File(tmpDir, "Main.java");
        Files.writeString(sourceFile.toPath(), code);

        // Compile the code
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        StandardJavaFileManager fileManager = compiler.getStandardFileManager(diagnostics, null, null);

        Iterable<? extends JavaFileObject> compilationUnits = 
            fileManager.getJavaFileObjectsFromFiles(Collections.singletonList(sourceFile));

        JavaCompiler.CompilationTask task = compiler.getTask(
            null, fileManager, diagnostics, null, null, compilationUnits);

        if (!task.call()) {
            throw new RuntimeException("Compilation failed: " + diagnostics.getDiagnostics());
        }

        // Load and execute the compiled class
        URLClassLoader classLoader = new URLClassLoader(new java.net.URL[]{tmpDir.toURI().toURL()});
        Class<?> mainClass = classLoader.loadClass("Main");

        // Instrument the class for execution tracking
        // This is where we'd add bytecode instrumentation to track memory state
        // For now, we'll just simulate the execution steps

        // Simulate execution steps
        sendExecutionStep("Loading class 'Main'", new HashMap<>());
        sendExecutionStep("Creating new instance of Main", new HashMap<>());
        sendExecutionStep("Executing main method", new HashMap<>());
    }

    private void sendExecutionStep(String description, Map<String, Object> memoryState) throws Exception {
        Map<String, Object> step = new HashMap<>();
        step.put("stepNumber", stepNumber++);
        step.put("description", description);
        step.put("memoryState", memoryState);

        String stepJson = objectMapper.writeValueAsString(step);
        producer.send(new ProducerRecord<>("java-execution", stepJson));
    }

    private void sendError(Exception e) {
        try {
            Map<String, Object> error = new HashMap<>();
            error.put("type", "error");
            error.put("message", e.getMessage());
            
            String errorJson = objectMapper.writeValueAsString(error);
            producer.send(new ProducerRecord<>("java-execution", errorJson));
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    public static void main(String[] args) {
        new Executor().start();
    }
}