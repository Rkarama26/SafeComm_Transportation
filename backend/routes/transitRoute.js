const express = require("express");
const {
  getAllRoutes,
  getRouteDetails,
  getNearbyStops,
  getStopSchedule,
  getTripsForRoute,
  getRouteFromMappls,
} = require("../controllers/transitController");
const { ensureGeospatialIndex } = require("../config/db");
const { RateLimiter } = require("../middleware/rateLimiter");
const transitRouter = express.Router();

// Public routes
transitRouter.get("/routes", getAllRoutes);
transitRouter.get("/routes/:route_id", getRouteDetails);
transitRouter.get("/stops/nearby", getNearbyStops);
transitRouter.get("/stops/:stop_id/schedule", getStopSchedule);
transitRouter.get("/trips", getTripsForRoute);
//mapples routes
transitRouter.get("/routes/find", RateLimiter(10, 1), getRouteFromMappls);

// Admin route to ensure geospatial index
transitRouter.post("/admin/ensure-geospatial-index", async (req, res) => {
  try {
    const success = await ensureGeospatialIndex();
    if (success) {
      res.json({ success: true, message: "Geospatial index ensured successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to create geospatial index" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = transitRouter;
