const express = require("express");
const {
  discoverRealtimeFeeds,
  findRealtimeFeedsForStaticFeed,
  getRealtimeFeedById,
  getRealtimeFeedUrls,
  getRealtimeFeedData,
  addRealtimeFeed,
  removeRealtimeFeed,
} = require("../controllers/gtfsRealtimeController");

const gtfsRealtimeRouter = express.Router();

/**
 * @swagger
 * /api/gtfs-rt/discover:
 *   get:
 *     summary: Discover available GTFS-RT (Realtime) feeds
 *     tags: [GTFS Realtime]
 *     parameters:
 *       - in: query
 *         name: country_code
 *         schema:
 *           type: string
 *           default: US
 *         description: ISO 3166-1 alpha-2 country code
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of feeds to return
 *     responses:
 *       200:
 *         description: Realtime feeds discovered successfully
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
 *                         description: Feed identifier
 *                       name:
 *                         type: string
 *                         description: Feed name
 *                       country:
 *                         type: string
 *                         description: Country code
 *                       realtimeFeeds:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             type:
 *                               type: string
 *                               enum: [vehicle_positions, trip_updates, service_alerts]
 *                             url:
 *                               type: string
 *                               format: uri
 *       500:
 *         description: Discovery failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRealtimeRouter.get("/discover", discoverRealtimeFeeds);

/**
 * @swagger
 * /api/gtfs-rt/static/{staticFeedId}:
 *   get:
 *     summary: Find realtime feeds associated with a static GTFS feed
 *     tags: [GTFS Realtime]
 *     parameters:
 *       - in: path
 *         name: staticFeedId
 *         required: true
 *         schema:
 *           type: string
 *         description: Static GTFS feed identifier
 *     responses:
 *       200:
 *         description: Realtime feeds found successfully
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
 *                       type:
 *                         type: string
 *                         enum: [vehicle_positions, trip_updates, service_alerts]
 *                       url:
 *                         type: string
 *                         format: uri
 *                       isActive:
 *                         type: boolean
 *                         description: Whether this feed is actively monitored
 *       404:
 *         description: Static feed not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRealtimeRouter.get("/static/:staticFeedId", findRealtimeFeedsForStaticFeed);

/**
 * @swagger
 * /api/gtfs-rt/feed/{realtimeFeedId}:
 *   get:
 *     summary: Get information about a specific realtime feed
 *     tags: [GTFS Realtime]
 *     parameters:
 *       - in: path
 *         name: realtimeFeedId
 *         required: true
 *         schema:
 *           type: string
 *         description: Realtime feed identifier
 *     responses:
 *       200:
 *         description: Feed information retrieved successfully
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
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [vehicle_positions, trip_updates, service_alerts]
 *                     url:
 *                       type: string
 *                       format: uri
 *                     isActive:
 *                       type: boolean
 *                     lastFetched:
 *                       type: string
 *                       format: date-time
 *                     updateFrequency:
 *                       type: integer
 *                       description: Update frequency in seconds
 *       404:
 *         description: Feed not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRealtimeRouter.get("/feed/:realtimeFeedId", getRealtimeFeedById);

/**
 * @swagger
 * /api/gtfs-rt/feed/{realtimeFeedId}/urls:
 *   get:
 *     summary: Get URLs for a realtime feed
 *     tags: [GTFS Realtime]
 *     parameters:
 *       - in: path
 *         name: realtimeFeedId
 *         required: true
 *         schema:
 *           type: string
 *         description: Realtime feed identifier
 *     responses:
 *       200:
 *         description: Feed URLs retrieved successfully
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
 *                     feedId:
 *                       type: string
 *                     urls:
 *                       type: object
 *                       properties:
 *                         vehicle_positions:
 *                           type: string
 *                           format: uri
 *                         trip_updates:
 *                           type: string
 *                           format: uri
 *                         service_alerts:
 *                           type: string
 *                           format: uri
 *       404:
 *         description: Feed not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRealtimeRouter.get("/feed/:realtimeFeedId/urls", getRealtimeFeedUrls);

/**
 * @swagger
 * /api/gtfs-rt/feed/{realtimeFeedId}/data:
 *   get:
 *     summary: Get parsed realtime data from a feed
 *     tags: [GTFS Realtime]
 *     parameters:
 *       - in: path
 *         name: realtimeFeedId
 *         required: true
 *         schema:
 *           type: string
 *         description: Realtime feed identifier
 *     responses:
 *       200:
 *         description: Realtime data retrieved successfully
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
 *                     feedId:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     vehiclePositions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Vehicle'
 *                     tripUpdates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Trip update information
 *                     serviceAlerts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Service alert information
 *       404:
 *         description: Feed not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to parse realtime data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRealtimeRouter.get("/feed/:realtimeFeedId/data", getRealtimeFeedData);

/**
 * @swagger
 * /api/gtfs-rt/feed/{realtimeFeedId}/add:
 *   post:
 *     summary: Add a realtime feed to active monitoring
 *     tags: [GTFS Realtime Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: realtimeFeedId
 *         required: true
 *         schema:
 *           type: string
 *         description: Realtime feed identifier
 *     responses:
 *       200:
 *         description: Feed added to monitoring successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Feed added to active monitoring"
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedId:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Feed not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRealtimeRouter.post("/feed/:realtimeFeedId/add", addRealtimeFeed);

/**
 * @swagger
 * /api/gtfs-rt/feed/{realtimeFeedId}/remove:
 *   post:
 *     summary: Remove a realtime feed from active monitoring
 *     tags: [GTFS Realtime Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: realtimeFeedId
 *         required: true
 *         schema:
 *           type: string
 *         description: Realtime feed identifier
 *     responses:
 *       200:
 *         description: Feed removed from monitoring successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Feed removed from active monitoring"
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedId:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Feed not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRealtimeRouter.post("/feed/:realtimeFeedId/remove", removeRealtimeFeed);

module.exports = gtfsRealtimeRouter;
