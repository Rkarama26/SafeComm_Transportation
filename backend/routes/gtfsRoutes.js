const express = require("express");
const {
  discoverGTFSFeeds,
  getGTFSFeedById,
  getGTFSFeedUrl,
  discoverAndImportGTFS,
  importGTFSById,
} = require("../controllers/gtfsDiscoveryController");

const gtfsRouter = express.Router();

// Discover GTFS feeds for a particular location
gtfsRouter.get("/discover", discoverGTFSFeeds);

// Get GTFS feed URL by feed ID
gtfsRouter.get("/feed-url/:feedId", getGTFSFeedUrl);

// Discover and import GTFS data for a location
gtfsRouter.post("/discover-and-import", discoverAndImportGTFS);

// Get specific GTFS feed by ID
gtfsRouter.get("/feed/:feedId", getGTFSFeedById);

// Import GTFS data for a specific feed ID
gtfsRouter.post("/import/:feedId", importGTFSById);

module.exports = gtfsRouter;
