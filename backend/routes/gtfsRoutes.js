const express = require("express");
const {
  discoverGTFSFeeds,
  getGTFSFeedById,
  getGTFSFeedUrl,
  discoverAndImportGTFS,
  importGTFSById,
} = require("../controllers/gtfsDiscoveryController");

const gtfsRouter = express.Router();

/**
 * @swagger
 * /api/gtfs/discover:
 *   get:
 *     summary: Discover available GTFS feeds for a location
 *     tags: [GTFS Management]
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location name or coordinates to search for GTFS feeds
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country code (ISO 3166-1 alpha-2)
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State or province name
 *     responses:
 *       200:
 *         description: GTFS feeds discovered successfully
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
 *                       url:
 *                         type: string
 *                         format: uri
 *                         description: Feed URL
 *                       location:
 *                         type: string
 *                         description: Geographic location
 *                       country:
 *                         type: string
 *                         description: Country code
 *       500:
 *         description: Discovery failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRouter.get("/discover", discoverGTFSFeeds);

/**
 * @swagger
 * /api/gtfs/feed-url/{feedId}:
 *   get:
 *     summary: Get GTFS feed URL by feed ID
 *     tags: [GTFS Management]
 *     parameters:
 *       - in: path
 *         name: feedId
 *         required: true
 *         schema:
 *           type: string
 *         description: GTFS feed identifier
 *     responses:
 *       200:
 *         description: Feed URL retrieved successfully
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
 *                     url:
 *                       type: string
 *                       format: uri
 *                       description: GTFS feed URL
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Feed not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRouter.get("/feed-url/:feedId", getGTFSFeedUrl);

/**
 * @swagger
 * /api/gtfs/discover-and-import:
 *   post:
 *     summary: Discover GTFS feeds and import data for a location
 *     tags: [GTFS Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location
 *             properties:
 *               location:
 *                 type: string
 *                 description: Location name or coordinates
 *               country:
 *                 type: string
 *                 description: Country code (ISO 3166-1 alpha-2)
 *               state:
 *                 type: string
 *                 description: State or province name
 *     responses:
 *       200:
 *         description: GTFS data discovered and imported successfully
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
 *                   example: "GTFS data imported successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedsImported:
 *                       type: integer
 *                       description: Number of feeds imported
 *                     routesAdded:
 *                       type: integer
 *                       description: Number of routes added
 *                     stopsAdded:
 *                       type: integer
 *                       description: Number of stops added
 *                     tripsAdded:
 *                       type: integer
 *                       description: Number of trips added
 *       400:
 *         description: Invalid location data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRouter.post("/discover-and-import", discoverAndImportGTFS);

/**
 * @swagger
 * /api/gtfs/feed/{feedId}:
 *   get:
 *     summary: Get detailed information about a specific GTFS feed
 *     tags: [GTFS Management]
 *     parameters:
 *       - in: path
 *         name: feedId
 *         required: true
 *         schema:
 *           type: string
 *         description: GTFS feed identifier
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
 *                     url:
 *                       type: string
 *                       format: uri
 *                     location:
 *                       type: string
 *                     country:
 *                       type: string
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         routes:
 *                           type: integer
 *                         stops:
 *                           type: integer
 *                         trips:
 *                           type: integer
 *       404:
 *         description: Feed not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRouter.get("/feed/:feedId", getGTFSFeedById);

/**
 * @swagger
 * /api/gtfs/import/{feedId}:
 *   post:
 *     summary: Import GTFS data for a specific feed ID
 *     tags: [GTFS Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feedId
 *         required: true
 *         schema:
 *           type: string
 *         description: GTFS feed identifier
 *     responses:
 *       200:
 *         description: GTFS data imported successfully
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
 *                   example: "GTFS data imported successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     routesAdded:
 *                       type: integer
 *                       description: Number of routes added
 *                     stopsAdded:
 *                       type: integer
 *                       description: Number of stops added
 *                     tripsAdded:
 *                       type: integer
 *                       description: Number of trips added
 *                     agenciesAdded:
 *                       type: integer
 *                       description: Number of agencies added
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
 *       500:
 *         description: Import failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gtfsRouter.post("/import/:feedId", importGTFSById);

module.exports = gtfsRouter;
