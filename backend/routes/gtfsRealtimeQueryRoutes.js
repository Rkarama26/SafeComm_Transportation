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
const authMiddleware = require("../middleware/auth_midleware");

/**
 * @swagger
 * /api/gtfs-rt/vehicles:
 *   get:
 *     summary: Get all vehicles with realtime positions
 *     tags: [Realtime Queries]
 *     responses:
 *       200:
 *         description: All vehicles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vehicle'
 *                 count:
 *                   type: integer
 *                   description: Number of vehicles returned
 *                 source:
 *                   type: string
 *                   enum: [redis, mongodb]
 *                   description: Data source used
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/vehicles", authMiddleware(["user", "admin"]), getAllVehicles);

/**
 * @swagger
 * /api/gtfs-rt/vehicles/nearby:
 *   get:
 *     summary: Get vehicles near a specific location
 *     tags: [Realtime Queries]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: Latitude coordinate
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: Longitude coordinate
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 1000
 *         description: Search radius in meters
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of vehicles to return
 *     responses:
 *       200:
 *         description: Nearby vehicles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vehicle'
 *                 count:
 *                   type: integer
 *                   description: Number of vehicles returned
 *                 source:
 *                   type: string
 *                   enum: [redis, mongodb]
 *                   description: Data source used
 *       400:
 *         description: Invalid coordinates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/vehicles/nearby",
  authMiddleware(["user", "admin"]),
  getNearbyVehicles
);

/**
 * @swagger
 * /api/gtfs-rt/vehicles/{vehicleId}:
 *   get:
 *     summary: Get detailed information about a specific vehicle
 *     tags: [Realtime Queries]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique vehicle identifier
 *     responses:
 *       200:
 *         description: Vehicle details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
 *                 source:
 *                   type: string
 *                   enum: [redis, mongodb]
 *                   description: Data source used
 *       404:
 *         description: Vehicle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/vehicles/:vehicleId",
  authMiddleware(["user", "admin"]),
  getVehicleDetails
);

/**
 * @swagger
 * /api/gtfs-rt/routes/{routeId}/vehicles:
 *   get:
 *     summary: Get all vehicles currently operating on a specific route
 *     tags: [Realtime Queries]
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Route identifier
 *     responses:
 *       200:
 *         description: Route vehicles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vehicle'
 *                 count:
 *                   type: integer
 *                   description: Number of vehicles on the route
 *                 source:
 *                   type: string
 *                   enum: [redis, mongodb]
 *                   description: Data source used
 *       404:
 *         description: Route not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/routes/:routeId/vehicles",
  authMiddleware(["user", "admin"]),
  getRouteVehicles
);

/**
 * @swagger
 * /api/gtfs-rt/trips/{tripId}/updates:
 *   get:
 *     summary: Get realtime updates for a specific trip
 *     tags: [Realtime Queries]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip identifier
 *     responses:
 *       200:
 *         description: Trip updates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tripId:
 *                       type: string
 *                     updates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           stopId:
 *                             type: string
 *                           arrival:
 *                             type: object
 *                             properties:
 *                               delay:
 *                                 type: integer
 *                                 description: Delay in seconds
 *                               time:
 *                                 type: string
 *                                 format: date-time
 *                           departure:
 *                             type: object
 *                             properties:
 *                               delay:
 *                                 type: integer
 *                                 description: Delay in seconds
 *                               time:
 *                                 type: string
 *                                 format: date-time
 *       404:
 *         description: Trip not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/trips/:tripId/updates",
  authMiddleware(["user", "admin"]),
  getTripUpdates
);

/**
 * @swagger
 * /api/gtfs-rt/trips/{tripId}/eta:
 *   get:
 *     summary: Get estimated time of arrival for a trip
 *     tags: [Realtime Queries]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip identifier
 *     responses:
 *       200:
 *         description: Trip ETA retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tripId:
 *                       type: string
 *                     estimatedArrival:
 *                       type: string
 *                       format: date-time
 *                       description: Estimated arrival time
 *                     delay:
 *                       type: integer
 *                       description: Delay in seconds (positive = late, negative = early)
 *                     nextStop:
 *                       type: object
 *                       properties:
 *                         stopId:
 *                           type: string
 *                         stopName:
 *                           type: string
 *                         estimatedArrival:
 *                           type: string
 *                           format: date-time
 *       404:
 *         description: Trip not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/trips/:tripId/eta", authMiddleware(["user", "admin"]), getTripETA);

/**
 * @swagger
 * /api/gtfs-rt/alerts:
 *   get:
 *     summary: Get active service alerts
 *     tags: [Realtime Queries]
 *     parameters:
 *       - in: query
 *         name: routeId
 *         schema:
 *           type: string
 *         description: Filter alerts by route ID
 *       - in: query
 *         name: stopId
 *         schema:
 *           type: string
 *         description: Filter alerts by stop ID
 *     responses:
 *       200:
 *         description: Active alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Alert identifier
 *                       headerText:
 *                         type: string
 *                         description: Alert header
 *                       descriptionText:
 *                         type: string
 *                         description: Alert description
 *                       cause:
 *                         type: string
 *                         enum: [UNKNOWN_CAUSE, OTHER_CAUSE, TECHNICAL_PROBLEM, STRIKE, DEMONSTRATION, ACCIDENT, HOLIDAY, WEATHER, MAINTENANCE, CONSTRUCTION, POLICE_ACTIVITY, MEDICAL_EMERGENCY]
 *                       effect:
 *                         type: string
 *                         enum: [NO_SERVICE, REDUCED_SERVICE, SIGNIFICANT_DELAYS, DETOUR, ADDITIONAL_SERVICE, MODIFIED_SERVICE, OTHER_EFFECT, UNKNOWN_EFFECT, STOP_MOVED]
 *                       activePeriod:
 *                         type: object
 *                         properties:
 *                           start:
 *                             type: string
 *                             format: date-time
 *                           end:
 *                             type: string
 *                             format: date-time
 *                       informedEntities:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             routeId:
 *                               type: string
 *                             stopId:
 *                               type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/alerts", authMiddleware(["user", "admin"]), getActiveAlerts);

/**
 * @swagger
 * /api/gtfs-rt/scheduler/status:
 *   get:
 *     summary: Get the status of the realtime data scheduler
 *     tags: [System Status]
 *     responses:
 *       200:
 *         description: Scheduler status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isRunning:
 *                       type: boolean
 *                       description: Whether the scheduler is currently running
 *                     lastRun:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of the last scheduler run
 *                     nextRun:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of the next scheduled run
 *                     activeFeeds:
 *                       type: integer
 *                       description: Number of active realtime feeds
 *                     totalFeeds:
 *                       type: integer
 *                       description: Total number of configured feeds
 *                     lastUpdateStats:
 *                       type: object
 *                       properties:
 *                         vehiclesProcessed:
 *                           type: integer
 *                           description: Number of vehicles processed in last run
 *                         feedsUpdated:
 *                           type: integer
 *                           description: Number of feeds updated in last run
 *                         errors:
 *                           type: integer
 *                           description: Number of errors in last run
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/scheduler/status",
  authMiddleware(["user", "admin"]),
  getSchedulerStatus
);

module.exports = router;
