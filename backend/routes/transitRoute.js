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

/**
 * @swagger
 * /api/transit/routes:
 *   get:
 *     summary: Get all available transit routes
 *     tags: [Transit]
 *     responses:
 *       200:
 *         description: List of all routes retrieved successfully
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
 *                     $ref: '#/components/schemas/Route'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transitRouter.get("/routes", getAllRoutes);

/**
 * @swagger
 * /api/transit/routes/{route_id}:
 *   get:
 *     summary: Get detailed information about a specific route
 *     tags: [Transit]
 *     parameters:
 *       - in: path
 *         name: route_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique route identifier
 *     responses:
 *       200:
 *         description: Route details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 *       404:
 *         description: Route not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transitRouter.get("/routes/:route_id", getRouteDetails);

/**
 * @swagger
 * /api/transit/stops/nearby:
 *   get:
 *     summary: Get nearby transit stops based on coordinates
 *     tags: [Transit]
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
 *         description: Search radius in meters (default 1000)
 *     responses:
 *       200:
 *         description: Nearby stops retrieved successfully
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
 *                     $ref: '#/components/schemas/Stop'
 *       400:
 *         description: Invalid coordinates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transitRouter.get("/stops/nearby", getNearbyStops);

/**
 * @swagger
 * /api/transit/stops/{stop_id}/schedule:
 *   get:
 *     summary: Get schedule for a specific stop
 *     tags: [Transit]
 *     parameters:
 *       - in: path
 *         name: stop_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique stop identifier
 *     responses:
 *       200:
 *         description: Stop schedule retrieved successfully
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
 *                     stop:
 *                       $ref: '#/components/schemas/Stop'
 *                     schedule:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tripId:
 *                             type: string
 *                           arrivalTime:
 *                             type: string
 *                           departureTime:
 *                             type: string
 *                           routeId:
 *                             type: string
 *       404:
 *         description: Stop not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transitRouter.get("/stops/:stop_id/schedule", getStopSchedule);

/**
 * @swagger
 * /api/transit/trips:
 *   get:
 *     summary: Get trips for a specific route
 *     tags: [Transit]
 *     parameters:
 *       - in: query
 *         name: route_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route identifier
 *     responses:
 *       200:
 *         description: Trips retrieved successfully
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
 *                       tripId:
 *                         type: string
 *                       routeId:
 *                         type: string
 *                       serviceId:
 *                         type: string
 *                       directionId:
 *                         type: string
 *       404:
 *         description: Route not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transitRouter.get("/trips", getTripsForRoute);

/**
 * @swagger
 * /api/transit/routes/{route_id}/realtime:
 *   get:
 *     summary: Get route information with real-time vehicle positions
 *     tags: [Transit, Real-time]
 *     parameters:
 *       - in: path
 *         name: route_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique route identifier
 *     responses:
 *       200:
 *         description: Route with realtime data retrieved successfully
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
 *                     route:
 *                       $ref: '#/components/schemas/Route'
 *                     vehicles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Vehicle'
 *                     source:
 *                       type: string
 *                       enum: [redis, mongodb]
 *                       description: Data source used
 *       404:
 *         description: Route not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transitRouter.get("/routes/:route_id/realtime", getRouteWithRealtime);

/**
 * @swagger
 * /api/transit/stops/{stop_id}/realtime:
 *   get:
 *     summary: Get stop information with real-time data
 *     tags: [Transit, Real-time]
 *     parameters:
 *       - in: path
 *         name: stop_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique stop identifier
 *     responses:
 *       200:
 *         description: Stop with realtime data retrieved successfully
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
 *                     stop:
 *                       $ref: '#/components/schemas/Stop'
 *                     vehicles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Vehicle'
 *                     source:
 *                       type: string
 *                       enum: [redis, mongodb]
 *                       description: Data source used
 *       404:
 *         description: Stop not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transitRouter.get("/stops/:stop_id/realtime", getStopWithRealtime);

/**
 * @swagger
 * /api/transit/vehicles/live:
 *   get:
 *     summary: Get all live vehicle positions
 *     tags: [Transit, Real-time]
 *     responses:
 *       200:
 *         description: Live vehicles retrieved successfully
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
 *                 source:
 *                   type: string
 *                   enum: [redis, mongodb]
 *                   description: Data source used
 *                 count:
 *                   type: integer
 *                   description: Number of vehicles returned
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transitRouter.get("/vehicles/live", getLiveVehicles);

/**
 * @swagger
 * /api/transit/static/refresh:
 *   post:
 *     summary: Refresh static GTFS feeds from external sources
 *     tags: [Transit, Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Static feeds refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Feed refresh failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
transitRouter.post("/static/refresh", refreshStaticFeeds);

//mapples routes - fetche from mapmyindia, no longer needed in this configuration
//transitRouter.get("/routes/find", RateLimiter(10, 1), getRouteFromMappls);

module.exports = transitRouter;
