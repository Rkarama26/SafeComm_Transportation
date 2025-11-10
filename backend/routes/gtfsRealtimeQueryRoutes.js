const express = require("express");
const router = express.Router();
const {
  getNearbyVehicles,
  getRouteVehicles,
  getTripUpdates,
  getTripETA,
  getActiveAlerts,
  getVehicleDetails,
  getSchedulerStatus,
  getAllVehicles,
} = require("../controllers/gtfsRealtimeQueryController");

/**
 * Vehicle Queries
 */
router.get("/vehicles", getAllVehicles);
router.get("/vehicles/nearby", getNearbyVehicles);
router.get("/vehicles/:vehicleId", getVehicleDetails);

/**
 * Route Queries
 */
router.get("/routes/:routeId/vehicles", getRouteVehicles);

/**
 * Trip Queries
 */
router.get("/trips/:tripId/updates", getTripUpdates);
router.get("/trips/:tripId/eta", getTripETA);

/**
 * Alert Queries
 */
router.get("/alerts", getActiveAlerts);

/**
 * Scheduler Status
 */
router.get("/scheduler/status", getSchedulerStatus);

module.exports = router;
