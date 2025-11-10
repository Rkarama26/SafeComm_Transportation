const { Server } = require("socket.io");
const redisService = require("./redisService");
const { VehiclePositionModel } = require("../gtfs_models/RealtimeModels");

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Set();
    this.vehicleUpdateInterval = null;
    this.isBroadcasting = false;
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: [
          "http://localhost:5000",
          "http://127.0.0.1:5500",
          "http://localhost:3000",
          "http://127.0.0.1:3000",
        ],
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.setupEventHandlers();
    this.setupRedisSubscription();

    // Start broadcasting vehicle updates to all clients (with delay to let data populate)
    setTimeout(() => {
      this.startVehicleBroadcasting();
    }, 2000);

    console.log(
      "WebSocket service initialized with Redis pub/sub and periodic broadcasting"
    );
  }

  /**
   * Setup Redis pub/sub subscription for real-time updates
   */
  setupRedisSubscription() {
    redisService.subscribeToUpdates((update) => {
      // Broadcast to all connected clients
      if (this.io && this.connectedClients.size > 0) {
        this.io.emit("vehicle-update", [update]);

        // Also broadcast to route-specific rooms if routeId is available
        if (update.routeId) {
          this.io.to(`route-${update.routeId}`).emit("route-vehicle-update", {
            routeId: update.routeId,
            vehicles: [update],
          });
        }

        console.log(
          `Broadcasted realtime update for vehicle ${update.vehicleId} to ${this.connectedClients.size} clients`
        );
      }
    });

    console.log("Redis pub/sub subscription established for vehicle updates");
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send initial connection info
      socket.emit("connected", {
        message: "Connected to SafeComm Transportation realtime service",
        clientId: socket.id,
        connectedClients: this.connectedClients.size,
      });

      // Handle client requests for specific routes
      socket.on("subscribe-route", (routeId) => {
        socket.join(`route-${routeId}`);
        console.log(`Client ${socket.id} subscribed to route ${routeId}`);
        socket.emit("subscribed", {
          routeId,
          message: `Subscribed to route ${routeId}`,
        });
      });

      socket.on("unsubscribe-route", (routeId) => {
        socket.leave(`route-${routeId}`);
        console.log(`Client ${socket.id} unsubscribed from route ${routeId}`);
      });

      // Handle client requests for vehicle updates
      socket.on("request-vehicles", async (filters = {}) => {
        try {
          const vehicles = await this.getFilteredVehicles(filters);
          socket.emit("vehicle-update", vehicles);
        } catch (error) {
          socket.emit("error", {
            message: "Failed to fetch vehicles",
            error: error.message,
          });
        }
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  /**
   * Get filtered vehicle positions
   */
  async getFilteredVehicles(filters = {}) {
    try {
      let vehicles = [];

      // Get vehicles from MongoDB (where data is actively being stored)
      console.log("Fetching vehicles from MongoDB...");
      const query = {};

      // Add time filter (get all recent positions from last 10 minutes to ensure we have data)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      query.createdAt = { $gte: tenMinutesAgo };

      // Add route filter if specified
      if (filters.routeId) {
        query.routeId = filters.routeId;
      }

      // Add bounding box filter if specified
      if (filters.bounds) {
        const { north, south, east, west } = filters.bounds;
        query.latitude = { $gte: south, $lte: north };
        query.longitude = { $gte: west, $lte: east };
      }

      const mongoVehicles = await VehiclePositionModel.find(query)
        .sort({ createdAt: -1 })
        .limit(1000) // Limit results
        .lean();

      console.log(`Found ${mongoVehicles.length} vehicles in MongoDB`);
      vehicles = mongoVehicles;

      // If no vehicles in MongoDB, try Redis as fallback
      if (vehicles.length === 0) {
        console.log("No vehicles in MongoDB, checking Redis...");
        const redisConnected = await redisService.isConnected();

        if (redisConnected) {
          vehicles = await redisService.getAllVehiclePositions();

          // Apply filters to Redis data
          if (filters.routeId) {
            vehicles = vehicles.filter((v) => v.routeId === filters.routeId);
          }

          if (filters.bounds) {
            const { north, south, east, west } = filters.bounds;
            vehicles = vehicles.filter(
              (v) =>
                v.latitude >= south &&
                v.latitude <= north &&
                v.longitude >= west &&
                v.longitude <= east
            );
          }

          console.log(`Found ${vehicles.length} vehicles in Redis`);
        }
      }

      // If still no vehicles, return empty array
      if (vehicles.length === 0) {
        console.log("No vehicle data available from MongoDB or Redis");
        return [];
      }

      return vehicles.map((vehicle) => ({
        id: vehicle.vehicleId || vehicle.id,
        routeId: vehicle.routeId,
        position: {
          lat: vehicle.latitude,
          lng: vehicle.longitude,
          bearing: vehicle.bearing,
          speed: vehicle.speed,
        },
        timestamp: vehicle.timestamp,
        currentStopSequence: vehicle.currentStopSequence,
        stopId: vehicle.stopId,
        status: vehicle.currentStatus,
        congestionLevel: vehicle.congestionLevel,
        feedId: vehicle.realtimeFeedId || vehicle.feedId,
      }));
    } catch (error) {
      console.error("Error fetching filtered vehicles:", error.message);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Get mock vehicle data for testing when no real data is available
   */
  getMockVehicles() {
    const mockVehicles = [
      {
        id: "mock-bus-001",
        routeId: "1",
        position: {
          lat: 40.7128,
          lng: -74.006,
          bearing: 45,
          speed: 25.5,
        },
        timestamp: new Date(),
        currentStopSequence: 5,
        stopId: "stop_001",
        status: 0,
        congestionLevel: 0,
        feedId: "mock-feed",
      },
      {
        id: "mock-bus-002",
        routeId: "2",
        position: {
          lat: 40.7589,
          lng: -73.9851,
          bearing: 180,
          speed: 15.2,
        },
        timestamp: new Date(),
        currentStopSequence: 12,
        stopId: "stop_002",
        status: 0,
        congestionLevel: 0,
        feedId: "mock-feed",
      },
      {
        id: "mock-bus-003",
        routeId: "1",
        position: {
          lat: 40.7505,
          lng: -73.9934,
          bearing: 90,
          speed: 0,
        },
        timestamp: new Date(),
        currentStopSequence: 8,
        stopId: "stop_003",
        status: 1, // At stop
        congestionLevel: 0,
        feedId: "mock-feed",
      },
    ];

    return mockVehicles;
  }

  /**
   * Broadcast vehicle updates to all connected clients
   */
  async broadcastVehicleUpdates() {
    if (this.isBroadcasting || this.connectedClients.size === 0) {
      return;
    }

    this.isBroadcasting = true;

    try {
      // Get all recent vehicle positions (last 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const vehicles = await VehiclePositionModel.find({
        createdAt: { $gte: tenMinutesAgo },
      })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      if (vehicles.length > 0) {
        const vehicleData = vehicles.map((vehicle) => ({
          id: vehicle.vehicleId,
          routeId: vehicle.routeId,
          position: {
            lat: vehicle.latitude,
            lng: vehicle.longitude,
            bearing: vehicle.bearing,
            speed: vehicle.speed,
          },
          timestamp: vehicle.timestamp,
          currentStopSequence: vehicle.currentStopSequence,
          stopId: vehicle.stopId,
          status: vehicle.currentStatus,
          congestionLevel: vehicle.congestionLevel,
          feedId: vehicle.realtimeFeedId,
        }));

        // Broadcast to all clients
        this.io.emit("vehicle-update", vehicleData);

        // Also broadcast to route-specific rooms
        const routeGroups = {};
        vehicleData.forEach((vehicle) => {
          if (vehicle.routeId) {
            if (!routeGroups[vehicle.routeId]) {
              routeGroups[vehicle.routeId] = [];
            }
            routeGroups[vehicle.routeId].push(vehicle);
          }
        });

        // Send route-specific updates
        Object.entries(routeGroups).forEach(([routeId, routeVehicles]) => {
          this.io.to(`route-${routeId}`).emit("route-vehicle-update", {
            routeId,
            vehicles: routeVehicles,
          });
        });

        console.log(
          `Broadcasted ${vehicleData.length} vehicle updates to ${this.connectedClients.size} clients`
        );
      } else {
        console.log("No real vehicle data available for broadcasting");
      }
    } catch (error) {
      console.error("Error broadcasting vehicle updates:", error.message);
    } finally {
      this.isBroadcasting = false;
    }
  }

  /**
   * Start periodic vehicle broadcasting
   */
  startVehicleBroadcasting() {
    // Broadcast every 5 seconds for realtime updates
    this.vehicleUpdateInterval = setInterval(() => {
      this.broadcastVehicleUpdates();
    }, 5000);

    console.log("Vehicle broadcasting started (every 5 seconds)");
  }

  /**
   * Stop vehicle broadcasting
   */
  stopVehicleBroadcasting() {
    if (this.vehicleUpdateInterval) {
      clearInterval(this.vehicleUpdateInterval);
      this.vehicleUpdateInterval = null;
      console.log("Vehicle broadcasting stopped");
    }
  }

  /**
   * Notify clients when new data is available (called from scheduler)
   */
  async notifyNewDataAvailable(feedId, vehicleCount) {
    if (this.connectedClients.size > 0) {
      this.io.emit("data-updated", {
        feedId,
        vehicleCount,
        timestamp: new Date(),
      });

      console.log(
        `Notified ${this.connectedClients.size} clients about new data from ${feedId}`
      );
    }
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      isBroadcasting: this.isBroadcasting,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopVehicleBroadcasting();
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    this.connectedClients.clear();
    console.log("WebSocket service cleaned up");
  }
}

// Export singleton instance
module.exports = new WebSocketService();
