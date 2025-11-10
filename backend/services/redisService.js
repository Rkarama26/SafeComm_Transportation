const {
  getRedisClient,
  getRedisConfig,
  connectRedis,
} = require("../config/redis");

class RedisService {
  constructor() {
    // Initialize Redis connection
    connectRedis();
    this.config = getRedisConfig();
    this.client = getRedisClient();
  }

  // Check if Redis is connected
  async isConnected() {
    if (this.config.useRestAPI) {
      try {
        const response = await fetch(`${this.config.restURL}/ping`, {
          headers: {
            Authorization: `Bearer ${this.config.restToken}`,
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
        await this.client.ping();
        return true;
      } catch (err) {
        return false;
      }
    }
  }

  // Store vehicle position with TTL (5 minutes)
  async setVehiclePosition(vehicleId, positionData) {
    if (this.config.useRestAPI) {
      try {
        const response = await fetch(`${this.config.restURL}/setex`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.restToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: `vehicle:${vehicleId}`,
            ex: 300, // 5 minutes TTL
            value: JSON.stringify(positionData),
          }),
        });
        const data = await response.json();
        return data.result === "OK";
      } catch (err) {
        console.error("Redis REST API set error:", err.message);
        return false;
      }
    } else {
      try {
        const key = `vehicle:${vehicleId}`;
        await this.client.setex(key, 300, JSON.stringify(positionData));
        return true;
      } catch (err) {
        console.error("Redis set error:", err.message);
        return false;
      }
    }
  }

  // Get single vehicle position
  async getVehiclePosition(vehicleId) {
    if (this.config.useRestAPI) {
      try {
        const response = await fetch(`${this.config.restURL}/get`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.restToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: `vehicle:${vehicleId}`,
          }),
        });
        const data = await response.json();
        return data.result ? JSON.parse(data.result) : null;
      } catch (err) {
        console.error("Redis REST API get error:", err.message);
        return null;
      }
    } else {
      try {
        const data = await this.client.get(`vehicle:${vehicleId}`);
        return data ? JSON.parse(data) : null;
      } catch (err) {
        console.error("Redis get error:", err.message);
        return null;
      }
    }
  }

  // Get all active vehicles
  async getAllVehiclePositions() {
    if (this.config.useRestAPI) {
      try {
        // Get all vehicle keys
        const keysResponse = await fetch(`${this.config.restURL}/keys`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.restToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pattern: "vehicle:*",
          }),
        });
        const keysData = await keysResponse.json();

        if (!keysData.result || keysData.result.length === 0) {
          return [];
        }

        const keys = keysData.result;

        // Get all values
        const valuesResponse = await fetch(`${this.config.restURL}/mget`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.restToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ keys }),
        });
        const valuesData = await valuesResponse.json();

        if (!valuesData.result) {
          return [];
        }

        return valuesData.result
          .map((val, index) => {
            if (!val) return null;
            try {
              return {
                vehicleId: keys[index].replace("vehicle:", ""),
                ...JSON.parse(val),
              };
            } catch (e) {
              console.error("Error parsing vehicle data:", e.message);
              return null;
            }
          })
          .filter(Boolean);
      } catch (err) {
        console.error("Redis REST API getAll error:", err.message);
        return [];
      }
    } else {
      try {
        const keys = await this.client.keys("vehicle:*");
        if (keys.length === 0) return [];

        const values = await this.client.mget(keys);
        return values
          .map((val, index) => {
            if (!val) return null;
            try {
              return {
                vehicleId: keys[index].replace("vehicle:", ""),
                ...JSON.parse(val),
              };
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean);
      } catch (err) {
        console.error("Redis getAll error:", err.message);
        return [];
      }
    }
  }

  // Get vehicles by route
  async getVehiclesByRoute(routeId) {
    try {
      const allVehicles = await this.getAllVehiclePositions();
      return allVehicles.filter((vehicle) => vehicle.routeId === routeId);
    } catch (err) {
      console.error("Redis getByRoute error:", err.message);
      return [];
    }
  }

  // Publish vehicle updates for WebSocket
  async publishVehicleUpdate(vehicleId, positionData) {
    if (this.config.useRestAPI) {
      // For REST API, we'll store the message in a queue that WebSocket service can poll
      try {
        const message = JSON.stringify({
          vehicleId,
          ...positionData,
          timestamp: new Date(),
        });

        // Get current queue
        const getResponse = await fetch(`${this.config.restURL}/get`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.restToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: "vehicle-updates-queue",
          }),
        });
        const getData = await getResponse.json();

        let queue = [];
        if (getData.result) {
          queue = JSON.parse(getData.result);
        }

        // Add new message
        queue.push(message);

        // Store updated queue
        const setResponse = await fetch(`${this.config.restURL}/set`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.restToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: "vehicle-updates-queue",
            value: JSON.stringify(queue),
          }),
        });
        const setData = await setResponse.json();

        return setData.result === "OK";
      } catch (err) {
        console.error("Redis REST API publish error:", err.message);
        return false;
      }
    } else {
      try {
        await this.client.publish(
          "vehicle-updates",
          JSON.stringify({
            vehicleId,
            ...positionData,
            timestamp: new Date(),
          })
        );
        return true;
      } catch (err) {
        console.error("Redis publish error:", err.message);
        return false;
      }
    }
  }

  // Subscribe to vehicle updates (for WebSocket service)
  subscribeToUpdates(callback) {
    if (this.config.useRestAPI) {
      // For REST API, we poll the queue
      console.log("Redis REST API subscription started (polling mode)");

      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${this.config.restURL}/get`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.config.restToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: "vehicle-updates-queue",
            }),
          });
          const data = await response.json();

          if (data.result) {
            const messages = JSON.parse(data.result);
            messages.forEach((message) => {
              try {
                callback(JSON.parse(message));
              } catch (e) {
                console.error("Error parsing pub/sub message:", e.message);
              }
            });

            // Clear the queue after processing
            await fetch(`${this.config.restURL}/del`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${this.config.restToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                key: "vehicle-updates-queue",
              }),
            });
          }
        } catch (err) {
          // Silently handle polling errors
        }
      }, 2000); // Poll every 2 seconds

      return {
        stop: () => {
          clearInterval(pollInterval);
          console.log("Redis REST API subscription stopped");
        },
      };
    } else {
      try {
        const subscriber = this.client.duplicate();
        subscriber.subscribe("vehicle-updates");
        subscriber.on("message", (channel, message) => {
          if (channel === "vehicle-updates") {
            try {
              callback(JSON.parse(message));
            } catch (e) {
              console.error("Error parsing pub/sub message:", e.message);
            }
          }
        });
        return subscriber;
      } catch (err) {
        console.error("Redis subscribe error:", err.message);
        return null;
      }
    }
  }

  // Clear all vehicle data
  async clearAllVehicles() {
    if (this.config.useRestAPI) {
      try {
        // Get all vehicle keys
        const keysResponse = await fetch(`${this.config.restURL}/keys`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.restToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pattern: "vehicle:*",
          }),
        });
        const keysData = await keysResponse.json();

        if (keysData.result && keysData.result.length > 0) {
          const delResponse = await fetch(`${this.config.restURL}/del`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.config.restToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              keys: keysData.result,
            }),
          });
          const delData = await delResponse.json();
          return delData.result > 0;
        }

        return true;
      } catch (err) {
        console.error("Redis REST API clear error:", err.message);
        return false;
      }
    } else {
      try {
        const keys = await this.client.keys("vehicle:*");
        if (keys.length > 0) {
          await this.client.del(keys);
        }
        return true;
      } catch (err) {
        console.error("Redis clear error:", err.message);
        return false;
      }
    }
  }
}

module.exports = new RedisService();
