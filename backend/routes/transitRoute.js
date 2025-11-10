const express = require("express");
const {
  getAllRoutes,
  getRouteDetails,
  getNearbyStops,
  getStopSchedule,
  getTripsForRoute,
  getRouteFromMappls,
  getRouteWithRealtime,
  getStopWithRealtime,
  getLiveVehicles,
  refreshStaticFeeds,
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

// Combined static + realtime routes
transitRouter.get("/routes/:route_id/realtime", getRouteWithRealtime);
transitRouter.get("/stops/:stop_id/realtime", getStopWithRealtime);
transitRouter.get("/vehicles/live", getLiveVehicles);

// Static feed management
transitRouter.post("/static/refresh", refreshStaticFeeds);

//mapples routes - fetche from mapmyindia, no longer needed in this configuration
//transitRouter.get("/routes/find", RateLimiter(10, 1), getRouteFromMappls);

module.exports = transitRouter;
