const gtfsRealtimeService = require("../services/gtfsRealtimeService");
const gtfsRealtimeParser = require("../services/gtfsRealtimeParser");

/**
 * Discover GTFS Realtime feeds
 * GET /api/gtfs-rt/discover?country_code=US&limit=10&auth_type=0
 */
const discoverRealtimeFeeds = async (req, res) => {
  try {
    const filters = req.query;

    // Default to public feeds only (authentication_type = 0)
    // Allow 'all' to get all feeds including those requiring authentication
    if (!filters.auth_type || filters.auth_type === "all") {
      if (filters.auth_type !== "all") {
        filters.auth_type = 0;
      } else {
        delete filters.auth_type; // Remove to get all feeds
      }
    }

    console.log("Discovering GTFS-RT feeds with filters:", filters);

    const feeds = await gtfsRealtimeService.discoverRealtimeFeeds(filters);

    res.json({
      success: true,
      count: feeds.length,
      data: feeds,
    });
  } catch (error) {
    console.error("Error in discoverRealtimeFeeds controller:", error.message);

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
 * Find realtime feeds for a specific static feed
 * GET /api/gtfs-rt/static/:staticFeedId
 * Note: Only returns public feeds (no authentication required)
 */
const findRealtimeFeedsForStaticFeed = async (req, res) => {
  try {
    const { staticFeedId } = req.params;

    if (!staticFeedId) {
      return res.status(400).json({
        success: false,
        message: "Static feed ID is required",
      });
    }

    console.log(`Finding realtime feeds for static feed: ${staticFeedId}`);

    const realtimeFeeds =
      await gtfsRealtimeService.findRealtimeFeedsForStaticFeed(staticFeedId);

    res.json({
      success: true,
      staticFeedId,
      count: realtimeFeeds.length,
      data: realtimeFeeds,
    });
  } catch (error) {
    console.error(
      "Error in findRealtimeFeedsForStaticFeed controller:",
      error.message
    );

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
 * Get a specific realtime feed by ID
 * GET /api/gtfs-rt/feed/:realtimeFeedId
 */
const getRealtimeFeedById = async (req, res) => {
  try {
    const { realtimeFeedId } = req.params;

    if (!realtimeFeedId) {
      return res.status(400).json({
        success: false,
        message: "Realtime feed ID is required",
      });
    }

    const feed = await gtfsRealtimeService.getRealtimeFeedById(realtimeFeedId);

    res.json({
      success: true,
      data: feed,
    });
  } catch (error) {
    console.error("Error in getRealtimeFeedById controller:", error.message);

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
 * Get realtime feed URLs and authentication info
 * GET /api/gtfs-rt/feed/:realtimeFeedId/urls
 */
const getRealtimeFeedUrls = async (req, res) => {
  try {
    const { realtimeFeedId } = req.params;

    if (!realtimeFeedId) {
      return res.status(400).json({
        success: false,
        message: "Realtime feed ID is required",
      });
    }

    const urls = await gtfsRealtimeService.getRealtimeFeedUrls(realtimeFeedId);

    res.json({
      success: true,
      data: urls,
    });
  } catch (error) {
    console.error("Error in getRealtimeFeedUrls controller:", error.message);

    let statusCode = 500;
    if (error.message.includes("not found") || error.message.includes("404")) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get parsed realtime feed data (JSON)
 * GET /api/gtfs-rt/feed/:realtimeFeedId/data
 */
const getRealtimeFeedData = async (req, res) => {
  try {
    const { realtimeFeedId } = req.params;

    if (!realtimeFeedId) {
      return res.status(400).json({
        success: false,
        message: "Realtime feed ID is required",
      });
    }

    console.log(
      `Fetching and parsing data for realtime feed: ${realtimeFeedId}`
    );

    // Get feed URLs first
    const feedUrls = await gtfsRealtimeService.getRealtimeFeedUrls(
      realtimeFeedId
    );

    if (!feedUrls.realtimeUrls || feedUrls.realtimeUrls.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No realtime URLs found for feed ${realtimeFeedId}`,
      });
    }

    // Fetch protobuf data from first available URL
    const firstUrl = feedUrls.realtimeUrls[0].url;
    console.log(`Fetching protobuf from URL: ${firstUrl}`);

    const protoBuffer = await gtfsRealtimeService.fetchRealtimeData(firstUrl);

    // Parse protobuf to readable JSON
    console.log(`Parsing ${protoBuffer.length} bytes of protobuf data`);
    const parsedData = await gtfsRealtimeParser.parseRealtimeData(
      protoBuffer,
      realtimeFeedId,
      feedUrls.staticFeedReferences?.[0] // Use first static feed reference
    );

    // Return parsed JSON data
    res.json({
      success: true,
      feedId: realtimeFeedId,
      sourceUrl: firstUrl,
      data: parsedData,
    });
  } catch (error) {
    console.error("Error in getRealtimeFeedData controller:", error.message);

    let statusCode = 500;
    if (error.message.includes("not found") || error.message.includes("404")) {
      statusCode = 404;
    } else if (error.message.includes("timed out")) {
      statusCode = 504;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Add a realtime feed to active monitoring
 * POST /api/gtfs-rt/feed/:realtimeFeedId/add
 */
const addRealtimeFeed = async (req, res) => {
  try {
    const { realtimeFeedId } = req.params;

    if (!realtimeFeedId) {
      return res.status(400).json({
        success: false,
        message: "Realtime feed ID is required",
      });
    }

    const result = await gtfsRealtimeService.addRealtimeFeed(realtimeFeedId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.feed,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in addRealtimeFeed controller:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Remove a realtime feed from active monitoring
 * POST /api/gtfs-rt/feed/:realtimeFeedId/remove
 */
const removeRealtimeFeed = async (req, res) => {
  try {
    const { realtimeFeedId } = req.params;

    if (!realtimeFeedId) {
      return res.status(400).json({
        success: false,
        message: "Realtime feed ID is required",
      });
    }

    const result = await gtfsRealtimeService.removeRealtimeFeed(realtimeFeedId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in removeRealtimeFeed controller:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  discoverRealtimeFeeds,
  findRealtimeFeedsForStaticFeed,
  getRealtimeFeedById,
  getRealtimeFeedUrls,
  getRealtimeFeedData,
  addRealtimeFeed,
  removeRealtimeFeed,
};
