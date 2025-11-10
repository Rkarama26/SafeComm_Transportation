const express = require("express");
const { getToken, getTokenInfo } = require("../controllers/tokenController");
const authMiddleware = require("../middleware/auth_midleware");

const tokenRouter = express.Router();

/**
 * @swagger
 * /api/access_token:
 *   post:
 *     summary: Generate a new mobility token for the authenticated user
 *     tags: [Mobility Tokens]
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
 *               - vehicleId
 *             properties:
 *               routeId:
 *                 type: string
 *                 description: Route identifier for the token
 *               vehicleId:
 *                 type: string
 *                 description: Vehicle identifier for the token
 *               validityHours:
 *                 type: integer
 *                 default: 24
 *                 description: Token validity period in hours
 *     responses:
 *       201:
 *         description: Token generated successfully
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
 *                   example: "Token generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: Generated mobility token
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Token expiration timestamp
 *                     routeId:
 *                       type: string
 *                     vehicleId:
 *                       type: string
 *       400:
 *         description: Invalid request data
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
tokenRouter.post("/access_token", authMiddleware(["user", "admin"]), getToken);

/**
 * @swagger
 * /api/info:
 *   get:
 *     summary: Get information about mobility tokens
 *     tags: [Mobility Tokens]
 *     responses:
 *       200:
 *         description: Token information retrieved successfully
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
 *                     totalTokens:
 *                       type: integer
 *                       description: Total number of active tokens
 *                     activeTokens:
 *                       type: integer
 *                       description: Number of currently active tokens
 *                     expiredTokens:
 *                       type: integer
 *                       description: Number of expired tokens
 *                     tokenStats:
 *                       type: object
 *                       properties:
 *                         byRoute:
 *                           type: object
 *                           description: Token count grouped by route
 *                         byVehicle:
 *                           type: object
 *                           description: Token count grouped by vehicle
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
tokenRouter.get("/info", getTokenInfo);

module.exports = tokenRouter;
