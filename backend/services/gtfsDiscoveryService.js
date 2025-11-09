const axios = require("axios");

const MOBILITY_BASE_URL =
  process.env.MOBILITY_BASE_URL || "https://api.mobilitydatabase.org/v1";
const { getAccessToken } = require("./tokenService");

/**
 * Discover GTFS feeds for a specific location/area
 *  locationParams - Location parameters for GTFS feed discovery
 *  locationParams.provider - Provider name (optional) -- Metropolitan Transit Authority (MTA)
 *  locationParams.producer_url - Producer URL (optional)
 *  locationParams.country_code - Country code (e.g., "US")
 *  locationParams.subdivision_name - State/Province name
 *  locationParams.municipality - City name
 *  locationParams.dataset_latitudes - Latitude range (e.g., "33.5,34.5")
 *  locationParams.dataset_longitudes - Longitude range (e.g., "-118.0,-119.0")
 *  locationParams.bounding_filter_method - Filter method (optional)
 *  locationParams.limit - Number of results to return (default: 10)
 *  locationParams.offset - Offset for pagination (default: 0)
 *  Array of GTFS feed information
 */
async function discoverGTFSFeeds(locationParams = {}) {
  try {
    // Get access token
    const token = await getAccessToken();
    if (!token) {
      throw new Error(
        "Failed to obtain access token for Mobility Database API"
      );
    }

    //  query parameters
    const params = new URLSearchParams({
      limit: locationParams.limit || 10,
      offset: locationParams.offset || 0,
      ...locationParams,
    });

    // Remove undefined/null parameters
    for (const [key, value] of params.entries()) {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      }
    }

    console.log(
      `Discovering GTFS feeds with parameters:`,
      Object.fromEntries(params)
    );

    // Make API request
    const response = await axios.get(`${MOBILITY_BASE_URL}/gtfs_feeds`, {
      params,
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000, // 30 second timeout
    });

    const feeds = response.data;

    if (!Array.isArray(feeds)) {
      throw new Error("Invalid response format from Mobility Database API");
    }

    console.log(`Found ${feeds.length} GTFS feeds`);

    return feeds;
  } catch (error) {
    console.error("Error discovering GTFS feeds:", error.message);

    if (error.response) {
      // API returned an error
      if (error.response.status === 401) {
        throw new Error(
          "Authentication failed with Mobility Database API. Token may be expired."
        );
      } else if (error.response.status === 403) {
        throw new Error(
          "Access forbidden to Mobility Database API. Check your permissions."
        );
      } else if (error.response.status === 429) {
        throw new Error(
          "Rate limit exceeded for Mobility Database API. Please try again later."
        );
      } else {
        throw new Error(
          `Mobility Database API error: ${error.response.status} - ${error.response.statusText}`
        );
      }
    } else if (error.code === "ECONNREFUSED") {
      throw new Error(
        "Cannot connect to Mobility Database API. Check your internet connection."
      );
    } else {
      throw new Error(`Failed to discover GTFS feeds: ${error.message}`);
    }
  }
}

/**
 * Get the hosted URL for a specific GTFS feed by ID
 *  feedId - The GTFS feed ID ( "mdb-1210")
 *  The hosted URL or null if not found
 */
async function getGTFSFeedUrl(feedId) {
  try {
    // Get feed directly by ID
    const feed = await getGTFSFeedById(feedId);

    if (!feed) {
      throw new Error(`GTFS feed with ID '${feedId}' not found`);
    }

    if (!feed.latest_dataset || !feed.latest_dataset.hosted_url) {
      throw new Error(`No hosted URL available for GTFS feed '${feedId}'`);
    }

    return feed.latest_dataset.hosted_url;
  } catch (error) {
    console.error(`Error getting GTFS feed URL for ${feedId}:`, error.message);
    throw error;
  }
}

/**
 * Discover and return GTFS feed information for a specific location
 * @param {Object} locationParams - Location parameters for discovery
 * @param {string} preferredFeedId - Optional specific feed ID to use
 * @returns {Promise<Object>} Feed information ready for import
 */
async function discoverAndImportGTFS(locationParams, preferredFeedId = null) {
  try {
    console.log("Starting GTFS discovery process...");

    let selectedFeed;
    let feedUrl;

    if (preferredFeedId) {
      // If feed ID is provided directly, fetch it specifically
      console.log(`Fetching specific GTFS feed: ${preferredFeedId}`);
      selectedFeed = await getGTFSFeedById(preferredFeedId);
      feedUrl = selectedFeed.latest_dataset?.hosted_url;
    } else {
      // Otherwise, discover feeds based on location parameters
      const feeds = await discoverGTFSFeeds(locationParams);

      if (feeds.length === 0) {
        throw new Error("No GTFS feeds found for the specified location");
      }

      selectedFeed = feeds[0];
      feedUrl = selectedFeed.latest_dataset?.hosted_url;
    }

    if (!feedUrl) {
      throw new Error(`No download URL available for feed ${selectedFeed.id}`);
    }

    console.log(
      `Selected GTFS feed: ${selectedFeed.id} - ${selectedFeed.feed_name}`
    );
    console.log(`Feed URL: ${feedUrl}`);

    // Return feed information for import instead of importing directly
    return {
      success: true,
      feed: {
        id: selectedFeed.id,
        name: selectedFeed.feed_name,
        provider: selectedFeed.provider,
        url: feedUrl,
        locations: selectedFeed.locations,
        bounding_box: selectedFeed.bounding_box,
      },
      message: `Feed discovered successfully. Ready for import.`,
    };
  } catch (error) {
    console.error("Error in GTFS discovery:", error.message);
    return {
      success: false,
      error: error.message,
      message: "Failed to discover GTFS feed",
    };
  }
}

/**
 * Get a specific GTFS feed by ID
 * @param {string} feedId - The GTFS feed ID (e.g., "mdb-27")
 * @returns {Promise<Object>} GTFS feed information
 */
async function getGTFSFeedById(feedId) {
  try {
    if (!feedId) {
      throw new Error("Feed ID is required");
    }

    // Get access token
    const token = await getAccessToken();
    if (!token) {
      throw new Error(
        "Failed to obtain access token for Mobility Database API"
      );
    }

    console.log(`Fetching GTFS feed with ID: ${feedId}`);

    // Make direct API request to get specific feed
    const response = await axios.get(
      `${MOBILITY_BASE_URL}/gtfs_feeds/${feedId}`,
      {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000, // 30 second timeout
      }
    );

    const feed = response.data;

    if (!feed || !feed.id) {
      throw new Error(`GTFS feed with ID '${feedId}' not found`);
    }

    console.log(
      `Successfully retrieved GTFS feed: ${feed.id} - ${
        feed.feed_name || "Unknown"
      }`
    );

    return feed;
  } catch (error) {
    console.error(`Error getting GTFS feed by ID ${feedId}:`, error.message);

    if (error.response) {
      // API returned an error
      if (error.response.status === 401) {
        throw new Error(
          "Authentication failed with Mobility Database API. Token may be expired."
        );
      } else if (error.response.status === 403) {
        throw new Error(
          "Access forbidden to Mobility Database API. Check your permissions."
        );
      } else if (error.response.status === 404) {
        throw new Error(`GTFS feed with ID '${feedId}' not found`);
      } else if (error.response.status === 429) {
        throw new Error(
          "Rate limit exceeded for Mobility Database API. Please try again later."
        );
      } else {
        throw new Error(
          `Mobility Database API error: ${error.response.status} - ${error.response.statusText}`
        );
      }
    } else if (error.code === "ECONNREFUSED") {
      throw new Error(
        "Cannot connect to Mobility Database API. Check your internet connection."
      );
    } else {
      throw new Error(`Failed to get GTFS feed: ${error.message}`);
    }
  }
}

module.exports = {
  discoverGTFSFeeds,
  getGTFSFeedUrl,
  discoverAndImportGTFS,
  getGTFSFeedById,
};
