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
 * GTFS Feed Import Endpoint
 */
feedRouter.post("/import", importFeed);

/**
 * Route Safety Rating Endpoints
 */

// Create a new rating for a route
feedRouter.post("/ratings", protect, validateRequest, createRouteRating);

// Get all ratings for a specific route (public access)
feedRouter.get("/ratings/:routeId", validateRequest, getRouteRatings);

// Get all ratings submitted by the current user
feedRouter.get("/ratings/user/my-ratings", protect, getUserRatings);

// Update an existing rating
feedRouter.put(
  "/ratings/:ratingId",
  protect,
  validateRequest,
  updateRouteRating
);

// Delete a rating
feedRouter.delete("/ratings/:ratingId", protect, deleteRouteRating);

// Get safety statistics for a route (public access)
feedRouter.get(
  "/stats/by-route/:routeId",
  validateRequest,
  getRouteSafetyStats
);

module.exports = feedRouter;
