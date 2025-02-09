import { WebSocketServer, WebSocket } from "ws"; // Fixed: Import WebSocket for state checks
import { Kafka } from "kafkajs";

const wss = new WebSocketServer({ port: 3001 });

// Fix: Handle missing KAFKA_BROKERS environment variable
if (!process.env.KAFKA_BROKERS) {
  throw new Error("KAFKA_BROKERS environment variable is required");
}
const kafka = new Kafka({
  clientId: "websocket-server",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const consumer = kafka.consumer({ groupId: "websocket-group" });
const producer = kafka.producer();

const executionHistory = new Map();

// Fix: Wrap async operations in an async function
async function setup() {
  try {
    await consumer.connect();
    await producer.connect();
    await consumer.subscribe({ topic: "java-execution", fromBeginning: true });

    // Fix: Handle consumer errors
    consumer.on("consumer.crash", ({ error }) => {
      console.error("Consumer crashed:", error);
    });

    wss.on("connection", (ws) => {
      console.log("Client connected");

      // Fix: Handle JSON parse errors
      ws.on("message", async (message) => {
        try {
          const data = JSON.parse(message);
          console.log({ data });

          switch (data.type) {
            case "execute":
              executionHistory.clear();
              await producer.send({
                topic: "java-code",
                messages: [{ value: JSON.stringify(data) }],
              });
              break;

            case "step":
              // Fix: Add error handling for missing steps
              const step = executionHistory.get(data.stepNumber);
              if (step) {
                ws.send(JSON.stringify(step));
              } else {
                ws.send(
                  JSON.stringify({
                    error: `Step ${data.stepNumber} not found`,
                  })
                );
              }
              break;
          }
        } catch (error) {
          console.error("Message handling error:", error);
          ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
      });

      // Fix: Handle WebSocket errors
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });

    // Fix: Handle message processing errors
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          if (!message.value) {
            throw new Error("Empty Kafka message received");
          }
          const executionData = JSON.parse(message.value.toString());
          executionHistory.set(executionData.stepNumber, executionData);

          // Fix: Use proper WebSocket state check
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(executionData));
            }
          });
        } catch (error) {
          console.error("Message processing error:", error);
        }
      },
    });
  } catch (error) {
    console.error("Initialization failed:", error);
    process.exit(1);
  }
}

setup(); // Start the application
