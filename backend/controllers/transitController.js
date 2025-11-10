const transitService = require("../services/transitService");
const redisService = require("../services/redisService");
const { VehiclePositionModel } = require("../gtfs_models/RealtimeModels");

// GET /api/transit/routes?feedId=mdb-1210&page=1&limit=10
const getAllRoutes = async (req, res) => {
  try {
    const { feedId, page = 1, limit = 10 } = req.query;
    const result = await transitService.getAllRoutes(
      feedId,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/transit/routes/:route_id
const getRouteDetails = async (req, res) => {
  try {
    const { route_id } = req.params;
    const result = await transitService.getRouteDetails(route_id);
    res.json(result);
  } catch (err) {
    if (err.message === "Route not found") {
      res.status(404).json({ success: false, message: err.message });
    } else {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// GET /api/transit/stops/nearby?lat=34.05&lon=-118.25&radius=1000
const getNearbyStops = async (req, res) => {
  try {
    const { lat, lon, radius } = req.query;
    const result = await transitService.getNearbyStops(lat, lon, radius);
    res.json(result);
  } catch (err) {
    //  ifvalidation error
    if (
      err.message.includes("required") ||
      err.message.includes("Invalid") ||
      err.message.includes("must be")
    ) {
      res.status(400).json({ success: false, message: err.message });
    } else if (err.message.includes("Geospatial search is not available")) {
      res.status(503).json({ success: false, message: err.message });
    } else {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// GET /api/transit/stops/:stop_id/schedule?date=2024-10-01
const getStopSchedule = async (req, res) => {
  try {
    const { stop_id } = req.params;
    const { date } = req.query;
    const result = await transitService.getStopSchedule(stop_id, date);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/transit/trips?route_id=123
const getTripsForRoute = async (req, res) => {
  try {
    const { route_id } = req.query;
    const result = await transitService.getTripsForRoute(route_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/transit/routes/:route_id/realtime
const getRouteWithRealtime = async (req, res) => {
  try {
    const { route_id } = req.params;

    // Get static route data
    const routeData = await transitService.getRouteDetails(route_id);

    if (!routeData.success) {
      return res.status(404).json(routeData);
    }

    // Try Redis first for realtime vehicles
    let vehicles = [];
    const redisConnected = await redisService.isConnected();

    if (redisConnected) {
      vehicles = await redisService.getVehiclesByRoute(route_id);
    }

    // If no vehicles in Redis or Redis not connected, fallback to MongoDB
    if (vehicles.length === 0) {
      vehicles = await VehiclePositionModel.find({
        routeId: route_id,
        timestamp: { $gt: new Date(Date.now() - 300000) }, // Last 5 minutes
      }).sort({ timestamp: -1 });
    }

    // Combine static and realtime data
    const combinedData = {
      ...routeData.data,
      realtime: {
        activeVehicles: vehicles.length,
        vehicles: vehicles.map((vehicle) => ({
          id: vehicle.vehicleId || vehicle.id,
          position: {
            lat: vehicle.latitude,
            lng: vehicle.longitude,
            bearing: vehicle.bearing,
            speed: vehicle.speed,
          },
          currentStopSequence: vehicle.currentStopSequence,
          stopId: vehicle.stopId,
          status: vehicle.currentStatus,
          congestionLevel: vehicle.congestionLevel,
          occupancyStatus: vehicle.occupancyStatus,
          occupancyPercentage: vehicle.occupancyPercentage,
          timestamp: vehicle.timestamp,
        })),
        lastUpdated: vehicles.length > 0 ? vehicles[0].timestamp : null,
        source: redisConnected && vehicles.length > 0 ? "redis" : "mongodb",
      },
    };

    res.json({
      success: true,
      data: combinedData,
    });
  } catch (err) {
    console.error("Error in getRouteWithRealtime:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/transit/stops/:stop_id/realtime
const getStopWithRealtime = async (req, res) => {
  try {
    const { stop_id } = req.params;

    // Get static stop data (you might need to add this to transitService)
    // For now, we'll focus on realtime vehicles near this stop
    const stopData = {
      stopId: stop_id,
      // You can add static stop info here when available
    };

    // Try Redis first for vehicles approaching this stop
    let vehicles = [];
    const redisConnected = await redisService.isConnected();

    if (redisConnected) {
      // Get all vehicles from Redis and filter by stopId
      const allVehicles = await redisService.getAllVehiclePositions();
      vehicles = allVehicles.filter((vehicle) => vehicle.stopId === stop_id);
    }

    // If no vehicles in Redis or Redis not connected, fallback to MongoDB
    if (vehicles.length === 0) {
      vehicles = await VehiclePositionModel.find({
        stopId: stop_id,
        timestamp: { $gt: new Date(Date.now() - 600000) }, // Last 10 minutes
      })
        .sort({ timestamp: -1 })
        .limit(10);
    }

    // Also get vehicles near this stop geographically (if we had stop coordinates)
    // This would require getting stop coordinates from static data first

    res.json({
      success: true,
      data: {
        ...stopData,
        realtime: {
          approachingVehicles: vehicles.length,
          vehicles: vehicles.map((vehicle) => ({
            id: vehicle.vehicleId || vehicle.id,
            routeId: vehicle.routeId,
            tripId: vehicle.tripId,
            distance: null, // Would need stop coordinates to calculate
            eta: null, // Would need to calculate based on current position and speed
            currentStopSequence: vehicle.currentStopSequence,
            status: vehicle.currentStatus,
            timestamp: vehicle.timestamp,
          })),
          lastUpdated: vehicles.length > 0 ? vehicles[0].timestamp : null,
          source: redisConnected && vehicles.length > 0 ? "redis" : "mongodb",
        },
      },
    });
  } catch (err) {
    console.error("Error in getStopWithRealtime:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/transit/static/refresh
const refreshStaticFeeds = async (req, res) => {
  try {
    // This would trigger re-importing of static GTFS feeds
    // For now, we'll return a placeholder response
    res.json({
      success: true,
      message: "Static feed refresh initiated",
      note: "Automatic refresh job would run weekly to update static GTFS data",
    });
  } catch (err) {
    console.error("Error in refreshStaticFeeds:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/transit/vehicles/live
const getLiveVehicles = async (req, res) => {
  try {
    const { routeId, limit = 1000, bbox } = req.query;

    let vehicles = [];
    let source = "mongodb"; // Default fallback
    const redisConnected = await redisService.isConnected();

    // Try Redis first for fastest response
    if (redisConnected) {
      vehicles = await redisService.getAllVehiclePositions();
      source = "redis";

      // Apply filters to Redis data
      if (routeId) {
        vehicles = vehicles.filter((v) => v.routeId === routeId);
      }

      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox
          .split(",")
          .map(parseFloat);
        vehicles = vehicles.filter(
          (v) =>
            v.longitude >= minLng &&
            v.longitude <= maxLng &&
            v.latitude >= minLat &&
            v.latitude <= maxLat
        );
      }
    }

    // If no vehicles in Redis or Redis not connected, fallback to MongoDB
    if (vehicles.length === 0 && !redisConnected) {
      let query = {
        timestamp: { $gt: new Date(Date.now() - 300000) }, // Last 5 minutes
      };

      if (routeId) {
        query.routeId = routeId.toString();
      }

      // Optional bounding box filter
      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox
          .split(",")
          .map(parseFloat);
        query.longitude = { $gte: minLng, $lte: maxLng };
        query.latitude = { $gte: minLat, $lte: maxLat };
      }

      vehicles = await VehiclePositionModel.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
      source = "mongodb";
    }

    // Limit results
    vehicles = vehicles.slice(0, parseInt(limit));

    res.json({
      success: true,
      count: vehicles.length,
      data: vehicles.map((vehicle) => ({
        id: vehicle.vehicleId || vehicle.id,
        routeId: vehicle.routeId,
        tripId: vehicle.tripId,
        position: {
          lat: vehicle.latitude,
          lng: vehicle.longitude,
          bearing: vehicle.bearing,
          speed: vehicle.speed,
        },
        currentStopSequence: vehicle.currentStopSequence,
        stopId: vehicle.stopId,
        status: vehicle.currentStatus,
        congestionLevel: vehicle.congestionLevel,
        occupancyStatus: vehicle.occupancyStatus,
        occupancyPercentage: vehicle.occupancyPercentage,
        feedId: vehicle.realtimeFeedId || vehicle.feedId,
        timestamp: vehicle.timestamp,
      })),
      timestamp: new Date(),
      source: source, // Indicates whether data came from Redis or MongoDB
    });
  } catch (err) {
    console.error("Error in getLiveVehicles:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllRoutes,
  getRouteDetails,
  getNearbyStops,
  getStopSchedule,
  getTripsForRoute,
  getRouteWithRealtime,
  getStopWithRealtime,
  getLiveVehicles,
  refreshStaticFeeds,
};
