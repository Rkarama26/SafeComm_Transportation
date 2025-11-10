const Redis = require("ioredis");

let redisClient = null;
let isConnecting = false;
let reconnectTimeout = null;

// Redis configuration
const getRedisConfig = () => {
  // Check if Redis REST API credentials are available
  const restURL = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (restURL && restToken) {
    return {
      useRestAPI: true,
      restURL,
      restToken,
    };
  } else {
    // Fall back to traditional Redis client
    return {
      useRestAPI: false,
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };
  }
};

const connectRedis = async () => {
  if (isConnecting) return;
  isConnecting = true;

  try {
    const config = getRedisConfig();

    if (config.useRestAPI) {
      console.log(" Initializing Redis REST API connection...");
      // For REST API, we don't need to establish a persistent connection
      // The connection is established on each request
      redisClient = { config, connected: true };
      console.log(" Redis REST API initialized successfully");
    } else {
      // Close existing connection if any
      if (redisClient && redisClient.disconnect) {
        try {
          await redisClient.disconnect();
        } catch (e) {
          // Ignore close errors
        }
      }

      console.log(" Connecting to Redis server...");

      redisClient = new Redis(config);

      // Set up connection event handlers
      redisClient.on("error", (err) => {
        console.error(" Redis connection error:", err.message);
        handleConnectionError();
      });

      redisClient.on("connect", () => {
        console.log(" Connected to Redis successfully");
        // Reset reconnection timeout on successful connection
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      });

      redisClient.on("close", () => {
        console.log(" Redis connection closed");
        handleConnectionError();
      });

      redisClient.on("reconnecting", () => {
        console.log(" Reconnecting to Redis...");
      });
    }
  } catch (error) {
    console.error(" Redis connection failed:", error.message);
    handleConnectionError();
  } finally {
    isConnecting = false;
  }
};

const handleConnectionError = () => {
  if (reconnectTimeout) return; // Already scheduled

  const config = getRedisConfig();
  if (!config.useRestAPI) {
    console.log(" Scheduling Redis reconnection in 5 seconds...");
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connectRedis();
    }, 5000);
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call connectRedis() first.");
  }
  return redisClient;
};

const isRedisConnected = async () => {
  if (!redisClient) return false;

  const config = getRedisConfig();
  if (config.useRestAPI) {
    // For REST API, test with a ping
    try {
      const response = await fetch(`${config.restURL}/ping`, {
        headers: {
          Authorization: `Bearer ${config.restToken}`,
        },
      });
      const data = await response.json();
      return data.result === "PONG";
    } catch (err) {
      console.error("Redis REST API ping error:", err.message);
      return false;
    }
  } else {
    try {
      await redisClient.ping();
      return true;
    } catch (err) {
      return false;
    }
  }
};

const getRedisConfigInfo = () => {
  const config = getRedisConfig();
  return {
    type: config.useRestAPI ? "rest-api" : "traditional",
    host: config.useRestAPI ? config.restURL : config.host,
    port: config.useRestAPI ? "REST API" : config.port,
  };
};

// Graceful shutdown
const closeRedisConnection = async () => {
  try {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    const config = getRedisConfig();
    if (!config.useRestAPI && redisClient && redisClient.disconnect) {
      await redisClient.disconnect();
      redisClient = null;
    }

    console.log(" Redis connection closed gracefully");
  } catch (error) {
    console.error(" Error closing Redis connection:", error.message);
  }
};

// Handle process termination
process.on("SIGINT", async () => {
  console.log(" Received SIGINT, closing Redis connection...");
  await closeRedisConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log(" Received SIGTERM, closing Redis connection...");
  await closeRedisConnection();
  process.exit(0);
});

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisConnected,
  getRedisConfigInfo,
  closeRedisConnection,
  getRedisConfig,
};
