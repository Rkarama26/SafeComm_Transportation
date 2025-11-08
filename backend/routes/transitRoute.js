const express = require("express");
const {
  getAllRoutes,
  getRouteFromMappls,
} = require("../controllers/transitController");
const { RateLimiter } = require("../middleware/rateLimiter");
const transitRouter = express.Router();

// Public routes
transitRouter.get("/routes", getAllRoutes);
transitRouter.get("/routes/find", RateLimiter(10, 1), getRouteFromMappls);

module.exports = transitRouter;
