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

// Discover available GTFS-RT feeds
// GET /api/gtfs-rt/discover?country_code=US&limit=10
gtfsRealtimeRouter.get("/discover", discoverRealtimeFeeds);

// Find realtime feeds for a specific static feed
// GET /api/gtfs-rt/static/:staticFeedId
gtfsRealtimeRouter.get("/static/:staticFeedId", findRealtimeFeedsForStaticFeed);

// Get specific realtime feed info
// GET /api/gtfs-rt/feed/:realtimeFeedId
gtfsRealtimeRouter.get("/feed/:realtimeFeedId", getRealtimeFeedById);

// Get URLs for a realtime feed
// GET /api/gtfs-rt/feed/:realtimeFeedId/urls
gtfsRealtimeRouter.get("/feed/:realtimeFeedId/urls", getRealtimeFeedUrls);

// Get parsed realtime data (JSON)
// GET /api/gtfs-rt/feed/:realtimeFeedId/data
gtfsRealtimeRouter.get("/feed/:realtimeFeedId/data", getRealtimeFeedData);

// Add feed to active monitoring
// POST /api/gtfs-rt/feed/:realtimeFeedId/add
gtfsRealtimeRouter.post("/feed/:realtimeFeedId/add", addRealtimeFeed);

// Remove feed from active monitoring
// POST /api/gtfs-rt/feed/:realtimeFeedId/remove
gtfsRealtimeRouter.post("/feed/:realtimeFeedId/remove", removeRealtimeFeed);

module.exports = gtfsRealtimeRouter;
