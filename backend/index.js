const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const { connectRabbitMQ, closeConnection } = require("./config/rabbitMq");
const {
  startEmailConsumer,
  stopEmailConsumer,
} = require("./queues/emailConsumer");
const app = require("./app");
const websocketService = require("./services/websocketService");

const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.IO integration
const http = require("http");
const server = http.createServer(app);

// Start in order
(async () => {
  try {
    await connectDB();

    // Make RabbitMQ optional for testing
    try {
      connectRabbitMQ();
      await startEmailConsumer();
    } catch (error) {
      console.warn(
        "RabbitMQ/email consumer failed, continuing without them:",
        error.message
      );
    }

    // Initialize and start realtime scheduler
    const realtimeScheduler = require("./cronJobs/realtimeUpdateCron");
    await realtimeScheduler.initialize();
    realtimeScheduler.start();

    // Initialize WebSocket service
    websocketService.initialize(server);

    // Start HTTP server with WebSocket support
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} with WebSocket support`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
})();

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}, initiating graceful shutdown...`);

  try {
    // Stop realtime scheduler
    const realtimeScheduler = require("./cronJobs/realtimeUpdateCron");
    realtimeScheduler.stop();

    // Stop accepting new connections
    app.close(async () => {
      console.log("HTTP server closed");

      // Stop email consumer (only if connected)
      try {
        await stopEmailConsumer();
      } catch (error) {
        console.warn("Email consumer stop failed:", error.message);
      }

      // Close RabbitMQ connection (only if connected)
      try {
        await closeConnection();
      } catch (error) {
        console.warn("RabbitMQ close failed:", error.message);
      }

      // Close database connection
      await mongoose.connection.close();

      console.log("Graceful shutdown completed");
      process.exit(0);
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});
