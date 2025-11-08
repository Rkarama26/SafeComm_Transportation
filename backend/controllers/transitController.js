const transitService = require("../services/transitService");

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
    // Check if it's a validation error
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

// GET or create route via Mappls
const getRouteFromMappls = async (req, res) => {
  try {
    const { source, destination, startLat, startLon, endLat, endLon } =
      req.query;

    //  Validate source & destination
    if (!source || !destination) {
      return res.status(400).json({
        success: false,
        message: "Please provide both source and destination.",
      });
    }

    //  Validate optional coordinates (if partially provided)
    const coords = [startLat, startLon, endLat, endLon];
    const hasAnyCoord = coords.some((v) => v !== undefined && v !== "");
    const hasAllCoords = coords.every((v) => v !== undefined && v !== "");

    if (hasAnyCoord && !hasAllCoords) {
      return res.status(400).json({
        success: false,
        message:
          "If you provide one coordinate (startLat/startLon/endLat/endLon), you must provide all four.",
      });
    }

    //  Fetch route (DB or Mappls)
    const route = await transitService.getRouteFromMappls(
      source,
      destination,
      startLat,
      startLon,
      endLat,
      endLon
    );

    res.status(200).json({
      success: true,
      source: route.sourceType, // 'database' or 'Mappls API'
      data: route.data,
    });
  } catch (error) {
    console.error("Mappls route error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get route from Mappls.",
    });
  }
};

module.exports = {
  getAllRoutes,
  getRouteDetails,
  getNearbyStops,
  getStopSchedule,
  getTripsForRoute,
  getRouteFromMappls,
};
