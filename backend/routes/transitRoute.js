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

//mapples routes - fetche from mapmyindia, no longer needed in this configuration
transitRouter.get("/routes/find", RateLimiter(10, 1), getRouteFromMappls);


module.exports = transitRouter;
