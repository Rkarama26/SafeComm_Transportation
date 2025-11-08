const amqp = require("amqplib");

let connection = null;
let channel = null;
let isConnecting = false;
let reconnectTimeout = null;

const connectRabbitMQ = async () => {
  if (isConnecting) return;
  isConnecting = true;

  try {
    // Close existing connection if any
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    console.log(" Connecting to RabbitMQ...");

    // Connect with heartbeat settings
    connection = await amqp.connect(process.env.RABBITMQ_URL, {
      heartbeat: 60, // Send heartbeat every 60 seconds
      connection_timeout: 60000, // 60 second connection timeout
    });

    channel = await connection.createChannel();

    // Set up connection event handlers
    connection.on("error", (err) => {
      console.error(" RabbitMQ connection error:", err.message);
      handleConnectionError();
    });

    connection.on("close", () => {
      console.log(" RabbitMQ connection closed");
      handleConnectionError();
    });

    // Set up channel event handlers
    channel.on("error", (err) => {
      console.error(" RabbitMQ channel error:", err.message);
      handleConnectionError();
    });

    channel.on("close", () => {
      console.log(" RabbitMQ channel closed");
      handleConnectionError();
    });

    console.log(" Connected to RabbitMQ successfully");

    // Reset reconnection timeout on successful connection
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  } catch (error) {
    console.error(" RabbitMQ connection failed:", error.message);
    handleConnectionError();
  } finally {
    isConnecting = false;
  }
};

const handleConnectionError = () => {
  if (reconnectTimeout) return; // Already scheduled

  console.log(" Scheduling RabbitMQ reconnection in 5 seconds...");
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectRabbitMQ();
  }, 5000);
};

const getChannel = () => {
  if (!channel) {
    throw new Error("RabbitMQ channel not available. Connection may be lost.");
  }
  return channel;
};

const isConnected = () => {
  return (
    connection &&
    channel &&
    connection.connection &&
    !connection.connection.destroyed
  );
};

// Graceful shutdown
const closeConnection = async () => {
  try {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (channel) {
      await channel.close();
      channel = null;
    }

    if (connection) {
      await connection.close();
      connection = null;
    }

    console.log(" RabbitMQ connection closed gracefully");
  } catch (error) {
    console.error(" Error closing RabbitMQ connection:", error.message);
  }
};

// Handle process termination
process.on("SIGINT", async () => {
  console.log(" Received SIGINT, closing RabbitMQ connection...");
  await closeConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log(" Received SIGTERM, closing RabbitMQ connection...");
  await closeConnection();
  process.exit(0);
});

module.exports = { connectRabbitMQ, getChannel, isConnected, closeConnection };
