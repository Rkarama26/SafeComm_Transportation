const {
  VehiclePositionModel,
  TripUpdateModel,
  ServiceAlertModel,
} = require("../gtfs_models/RealtimeModels");

/**mm
 * Find vehicles near a location
 * GET /api/gtfs-rt/vehicles/nearby?lat=34.05&lon=-118.24&radius=500
 */
const getNearbyVehicles = async (req, res) => {
  try {
    const { lat, lon, radius = 500 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const radiusMeters = parseFloat(radius);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusMeters)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates or radius",
      });
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Latitude must be between -90 and 90, longitude between -180 and 180",
      });
    }

    if (radiusMeters <= 0 || radiusMeters > 50000) {
      return res.status(400).json({
        success: false,
        message: "Radius must be between 0 and 50000 meters",
      });
    }

    // Geospatial query for vehicles near location
    const vehicles = await VehiclePositionModel.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusMeters,
        },
      },
      timestamp: { $gt: new Date(Date.now() - 60000) }, // Last minute only
    }).limit(50);

    res.json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    console.error("Error getting nearby vehicles:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get active vehicles for a specific route
 * GET /api/gtfs-rt/routes/:routeId/vehicles
 */
const getRouteVehicles = async (req, res) => {
  try {
    const { routeId } = req.params;

    if (!routeId) {
      return res.status(400).json({
        success: false,
        message: "routeId is required",
      });
    }

    const vehicles = await VehiclePositionModel.find({
      routeId: routeId.toString(),
      timestamp: { $gt: new Date(Date.now() - 60000) },
    });

    res.json({
      success: true,
      routeId,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    console.error("Error getting route vehicles:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get trip updates (delays, cancellations)
 * GET /api/gtfs-rt/trips/:tripId/updates
 */
const getTripUpdates = async (req, res) => {
  try {
    const { tripId } = req.params;

    if (!tripId) {
      return res.status(400).json({
        success: false,
        message: "tripId is required",
      });
    }

    const updates = await TripUpdateModel.findOne({
      tripId: tripId.toString(),
      timestamp: { $gt: new Date(Date.now() - 3600000) }, // Last hour
    }).sort({ timestamp: -1 });

    if (!updates) {
      return res.status(404).json({
        success: false,
        message: "No updates found for this trip",
      });
    }

    res.json({
      success: true,
      data: updates,
    });
  } catch (error) {
    console.error("Error getting trip updates:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get ETA for a trip at a specific stop
 * GET /api/gtfs-rt/trips/:tripId/eta?stopId=stop-123
 */
const getTripETA = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { stopId } = req.query;

    if (!tripId || !stopId) {
      return res.status(400).json({
        success: false,
        message: "tripId and stopId are required",
      });
    }

    const update = await TripUpdateModel.findOne({
      tripId: tripId.toString(),
      "stopTimeUpdates.stopId": stopId.toString(),
      timestamp: { $gt: new Date(Date.now() - 3600000) },
    }).sort({ timestamp: -1 });

    if (!update) {
      return res.status(404).json({
        success: false,
        message: "No ETA found for this trip/stop combination",
      });
    }

    const stopUpdate = update.stopTimeUpdates.find(
      (s) => s.stopId === stopId.toString()
    );

    if (!stopUpdate) {
      return res.status(404).json({
        success: false,
        message: "Stop not found in trip updates",
      });
    }

    res.json({
      success: true,
      data: {
        tripId,
        stopId,
        arrival: stopUpdate.arrival,
        departure: stopUpdate.departure,
        timestamp: update.timestamp,
      },
    });
  } catch (error) {
    console.error("Error getting trip ETA:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get active service alerts
 * GET /api/gtfs-rt/alerts?routeId=route-123
 */
const getActiveAlerts = async (req, res) => {
  try {
    const { routeId, stopId, limit = 20 } = req.query;

    let query = {
      "activePeriods.end": { $gt: new Date() },
    };

    if (routeId) {
      query.affectedRoutes = routeId.toString();
    }

    if (stopId) {
      query.affectedStops = stopId.toString();
    }

    const alerts = await ServiceAlertModel.find(query)
      .sort({ "activePeriods.start": -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error("Error getting alerts:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get vehicle details
 * GET /api/gtfs-rt/vehicles/:vehicleId
 */
const getVehicleDetails = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "vehicleId is required",
      });
    }

    const vehicle = await VehiclePositionModel.findOne({
      vehicleId: vehicleId.toString(),
      timestamp: { $gt: new Date(Date.now() - 60000) },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found or data is stale",
      });
    }

    res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Error getting vehicle details:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get scheduler status
 * GET /api/gtfs-rt/scheduler/status
 */
const getSchedulerStatus = async (req, res) => {
  try {
    const realtimeScheduler = require("../cronJobs/realtimeUpdateCron");
    const status = realtimeScheduler.getStatus();

    // Get stats from database
    const vehicleCount = await VehiclePositionModel.countDocuments({
      timestamp: { $gt: new Date(Date.now() - 60000) },
    });
    const tripUpdateCount = await TripUpdateModel.countDocuments({
      timestamp: { $gt: new Date(Date.now() - 60000) },
    });
    const alertCount = await ServiceAlertModel.countDocuments({
      "activePeriods.end": { $gt: new Date() },
    });

    res.json({
      success: true,
      data: {
        ...status,
        stats: {
          vehiclesInDb: vehicleCount,
          tripUpdatesInDb: tripUpdateCount,
          activeAlerts: alertCount,
        },
      },
    });
  } catch (error) {
    console.error("Error getting scheduler status:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all current vehicle positions
 * GET /api/gtfs-rt/vehicles?routeId=route-123&limit=1000&bbox=minLng,minLat,maxLng,maxLat
 */
const getAllVehicles = async (req, res) => {
  try {
    const { routeId, limit = 1000, bbox } = req.query;

    let query = {
      timestamp: { $gt: new Date(Date.now() - 300000) }, // Last 5 minutes
    };

    if (routeId) {
      query.routeId = routeId.toString();
    }

    // Optional bounding box filter
    if (bbox) {
      // bbox format: minLng,minLat,maxLng,maxLat
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(parseFloat);
      query.longitude = { $gte: minLng, $lte: maxLng };
      query.latitude = { $gte: minLat, $lte: maxLat };
    }

    const vehicles = await VehiclePositionModel.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: vehicles.length,
      data: vehicles,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error getting all vehicles:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getNearbyVehicles,
  getRouteVehicles,
  getTripUpdates,
  getTripETA,
  getActiveAlerts,
  getVehicleDetails,
  getSchedulerStatus,
  getAllVehicles,
};
