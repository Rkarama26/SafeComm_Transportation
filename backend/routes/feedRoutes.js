const express = require("express");
const {
  importFeed,
  createRouteRating,
  getRouteRatings,
  getUserRatings,
  updateRouteRating,
  deleteRouteRating,
  getRouteSafetyStats,
} = require("../controllers/feedController");
// auth_midleware exports a factory function (roles => middleware).
// Call it with no roles to get the default protect middleware.
const authMiddleware = require("../middleware/auth_midleware");
const protect = authMiddleware();
const {
  validateRatingInput,
  validateRouteId,
  validateRequest,
} = require("../middleware/authValidator");

const feedRouter = express.Router();

/**
 * @swagger
 * /api/feed/import:
 *   post:
 *     summary: Import GTFS feed data
 *     tags: [Feed Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feedUrl
 *             properties:
 *               feedUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL of the GTFS feed to import
 *     responses:
 *       200:
 *         description: Feed imported successfully
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
 *         description: Import failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
feedRouter.post("/import", importFeed);

/**
 * @swagger
 * /api/feed/ratings:
 *   post:
 *     summary: Create a safety rating for a route
 *     tags: [Safety Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeId
 *               - rating
 *               - comment
 *             properties:
 *               routeId:
 *                 type: string
 *                 description: Route identifier
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Safety rating (1-5 stars)
 *               comment:
 *                 type: string
 *                 description: Optional comment about the rating
 *     responses:
 *       201:
 *         description: Rating created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid input data
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
feedRouter.post(
  "/ratings",
  authMiddleware(["user", "admin"]),
  protect,
  validateRequest,
  createRouteRating
);

/**
 * @swagger
 * /api/feed/ratings/{routeId}:
 *   get:
 *     summary: Get all safety ratings for a specific route
 *     tags: [Safety Ratings]
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Route identifier
 *     responses:
 *       200:
 *         description: Ratings retrieved successfully
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
 *                       _id:
 *                         type: string
 *                       routeId:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       rating:
 *                         type: integer
 *                         minimum: 1
 *                         maximum: 5
 *                       comment:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Route not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
feedRouter.get(
  "/ratings/:routeId",
  authMiddleware(["user", "admin"]),
  validateRequest,
  getRouteRatings
);

/**
 * @swagger
 * /api/feed/ratings/user/my-ratings:
 *   get:
 *     summary: Get all safety ratings submitted by the current user
 *     tags: [Safety Ratings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User ratings retrieved successfully
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
 *                       _id:
 *                         type: string
 *                       routeId:
 *                         type: string
 *                       rating:
 *                         type: integer
 *                         minimum: 1
 *                         maximum: 5
 *                       comment:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
feedRouter.get(
  "/ratings/user/my-ratings",
  authMiddleware(["user", "admin"]),
  protect,
  getUserRatings
);

/**
 * @swagger
 * /api/feed/ratings/{ratingId}:
 *   put:
 *     summary: Update an existing safety rating
 *     tags: [Safety Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Updated safety rating (1-5 stars)
 *               comment:
 *                 type: string
 *                 description: Updated comment
 *     responses:
 *       200:
 *         description: Rating updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid input data
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
 *       404:
 *         description: Rating not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
feedRouter.put(
  "/ratings/:ratingId",
  authMiddleware(["user", "admin"]),
  protect,
  validateRequest,
  updateRouteRating
);

/**
 * @swagger
 * /api/feed/ratings/{ratingId}:
 *   delete:
 *     summary: Delete a safety rating
 *     tags: [Safety Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating identifier
 *     responses:
 *       200:
 *         description: Rating deleted successfully
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
 *       404:
 *         description: Rating not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
feedRouter.delete("/ratings/:ratingId", protect, deleteRouteRating);

/**
 * @swagger
 * /api/feed/stats/by-route/{routeId}:
 *   get:
 *     summary: Get safety statistics for a specific route
 *     tags: [Safety Statistics]
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Route identifier
 *     responses:
 *       200:
 *         description: Safety statistics retrieved successfully
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
 *                     routeId:
 *                       type: string
 *                     averageRating:
 *                       type: number
 *                       format: float
 *                       description: Average safety rating (1-5)
 *                     totalRatings:
 *                       type: integer
 *                       description: Total number of ratings
 *                     ratingDistribution:
 *                       type: object
 *                       properties:
 *                         1:
 *                           type: integer
 *                           description: Number of 1-star ratings
 *                         2:
 *                           type: integer
 *                           description: Number of 2-star ratings
 *                         3:
 *                           type: integer
 *                           description: Number of 3-star ratings
 *                         4:
 *                           type: integer
 *                           description: Number of 4-star ratings
 *                         5:
 *                           type: integer
 *                           description: Number of 5-star ratings
 *                     recentIncidents:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SafetyReport'
 *       404:
 *         description: Route not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
feedRouter.get(
  "/stats/by-route/:routeId",
  validateRequest,
  getRouteSafetyStats
);

module.exports = feedRouter;
