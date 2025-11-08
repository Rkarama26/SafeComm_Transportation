const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const { connectRabbitMQ, closeConnection } = require("./config/rabbitMq");
const {
  startEmailConsumer,
  stopEmailConsumer,
} = require("./queues/emailConsumer");
const app = require("./app");

const PORT = process.env.PORT || 5000;

// Start in order
(async () => {
  try {
    await connectDB();

    connectRabbitMQ();

    await startEmailConsumer();

    //   Express app
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(" Startup failed:", error);
    process.exit(1);
  }
})();

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, initiating graceful shutdown...`);

  try {
    // Stop accepting new connections
    app.close(async () => {
      console.log("📪 HTTP server closed");

      // Stop email consumer
      await stopEmailConsumer();

      // Close RabbitMQ connection
      await closeConnection();

      // Close database connection
      await mongoose.connection.close();

      console.log("✅ Graceful shutdown completed");
      process.exit(0);
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      console.error("❌ Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});
