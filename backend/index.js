const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const { connectRabbitMQ } = require("./config/rabbitMq");
const { startEmailConsumer } = require("./queues/emailConsumer");
const app = require("./app");

const PORT = process.env.PORT || 5000;

// Start in order
(async () => {
  try {
    connectDB();

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
