const gtfsDiscoveryService = require("../services/gtfsDiscoveryService");
const gtfsImporterService = require("../services/gtfsImporterService");

/**
 * Discover GTFS feeds for a location
 * GET /api/gtfs/discover?country_code=US&subdivision_name=California&municipality=Los%20Angeles&dataset_latitudes=33.5,34.5&dataset_longitudes=-118.0,-119.0
 */
const discoverGTFSFeeds = async (req, res) => {
  try {
    const locationParams = req.query;
    const feeds = await gtfsDiscoveryService.discoverGTFSFeeds(locationParams);

    res.json({
      success: true,
      count: feeds.length,
      data: feeds,
    });
  } catch (error) {
    console.error("Error in discoverGTFSFeeds controller:", error.message);

    // Determine appropriate status code based on error
    let statusCode = 500;
    if (
      error.message.includes("Authentication failed") ||
      error.message.includes("401")
    ) {
      statusCode = 401;
    } else if (
      error.message.includes("Rate limit exceeded") ||
      error.message.includes("429")
    ) {
      statusCode = 429;
    } else if (error.message.includes("Cannot connect")) {
      statusCode = 503;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 *  GTFS feed by feed ID
 * GET /api/gtfs/feed-url/:feedId
 */
const getGTFSFeedUrl = async (req, res) => {
  try {
    const { feedId } = req.params;
    const feedUrl = await gtfsDiscoveryService.getGTFSFeedUrl(feedId);

    res.json({
      success: true,
      feedId,
      feedUrl,
    });
  } catch (error) {
    console.error("Error in getGTFSFeedUrl controller:", error.message);

    let statusCode = 500;
    if (error.message.includes("not found")) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Discover and import GTFS data for a location
 * POST /api/gtfs/discover-and-import
 * Body: {
 *   "country_code": "US",
 *   "subdivision_name": "California",
 *   "municipality": "Los Angeles",
 *   "dataset_latitudes": "33.5,34.5",
 *   "dataset_longitudes": "-118.0,-119.0",
 *   "preferredFeedId": "mdb-1210" // optional
 *
 * or
 *  feedId: "mdb-1210"
 * }
 */
const discoverAndImportGTFS = async (req, res) => {
  try {
    const { preferredFeedId, ...locationParams } = req.body;

    console.log("Starting GTFS discovery and import for:", locationParams);

    // First discover the feed
    const discoveryResult = await gtfsDiscoveryService.discoverAndImportGTFS(
      locationParams,
      preferredFeedId
    );

    if (!discoveryResult.success) {
      return res.status(404).json(discoveryResult);
    }

    // Then import using the discovered feed ID
    const importResult = await gtfsImporterService.importGTFS(
      locationParams,
      discoveryResult.feed.id
    );

    if (importResult.success) {
      res.json({
        ...importResult,
        discovered_feed: discoveryResult.feed,
      });
    } else {
      res.status(500).json(importResult);
    }
  } catch (error) {
    console.error("Error in discoverAndImportGTFS controller:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get a specific GTFS feed by ID
 * GET /api/gtfs/feed/:feedId
 */
const getGTFSFeedById = async (req, res) => {
  try {
    const { feedId } = req.params;

    if (!feedId) {
      return res.status(400).json({
        success: false,
        message: "Feed ID is required",
      });
    }

    const feed = await gtfsDiscoveryService.getGTFSFeedById(feedId);

    res.json({
      success: true,
      data: feed,
    });
  } catch (error) {
    console.error("Error in getGTFSFeedById controller:", error.message);

    let statusCode = 500;
    if (error.message.includes("not found") || error.message.includes("404")) {
      statusCode = 404;
    } else if (
      error.message.includes("Authentication failed") ||
      error.message.includes("401")
    ) {
      statusCode = 401;
    } else if (
      error.message.includes("Rate limit exceeded") ||
      error.message.includes("429")
    ) {
      statusCode = 429;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Import GTFS data for a specific feed ID
 * POST /api/gtfs/import/:feedId
 */
const importGTFSById = async (req, res) => {
  try {
    const { feedId } = req.params;

    if (!feedId) {
      return res.status(400).json({
        success: false,
        message: "Feed ID is required",
      });
    }
    console.log(`Starting GTFS import for feed ID: ${feedId}`);

    // Import using the modified importGTFS function with feedId directly
    const result = await gtfsImporterService.importGTFS(null, feedId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Error in importGTFSById controller:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



module.exports = {
  discoverGTFSFeeds,
  getGTFSFeedUrl,
  discoverAndImportGTFS,
  getGTFSFeedById,
  importGTFSById,
};





