const axios = require("axios");
const { getAccessToken } = require("./tokenService");

const MOBILITY_BASE_URL =
  process.env.MOBILITY_BASE_URL || "https://api.mobilitydatabase.org/v1";

/**
 * Normalize realtime feed response to consistent format
 */
function normalizeFeedResponse(feed) {
  return {
    id: feed.id,
    dataType: feed.data_type || "gtfs_rt",
    provider: feed.provider,
    feedName: feed.feed_name || "Realtime Feed",
    feedContactEmail: feed.feed_contact_email,
    staticFeedReferences: feed.feed_references || [],
    entityTypes: feed.entity_types || [],
    locations: feed.locations || [],
    sourceInfo: feed.source_info
      ? {
          producerUrl: feed.source_info.producer_url,
          authenticationType: feed.source_info.authentication_type,
          authenticationInfoUrl: feed.source_info.authentication_info_url,
          apiKeyParameterName: feed.source_info.api_key_parameter_name,
          licenseUrl: feed.source_info.license_url,
        }
      : null,
    status: feed.status || "active",
    isOfficial: feed.official !== false,
    createdAt: feed.created_at,
    officialUpdatedAt: feed.official_updated_at,
    realtimeSources: feed.realtime_sources || [],
  };
}

/**
 * Discover GTFS Realtime feeds
 *  {Object} filters - Filter parameters
 *  {string} filters.country_code - Country code (e.g., "US")
 *  {string} filters.provider - Provider name
 *  {Array<string>} filters.feed_references - Array of static feed IDs to find realtime for
 *  {number} filters.limit - Number of results (default: 10)
 *  {number} filters.offset - Offset for pagination (default: 0)
 *  {number} filters.auth_type - Filter by authentication type (0=public, 1=basic auth, 2=api key, etc.)
 * @returns {Promise<Array>} Array of GTFS-RT feeds
 */
async function discoverRealtimeFeeds(filters = {}) {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error(
        "Failed to obtain access token for Mobility Database API"
      );
    }

    const params = new URLSearchParams({
      limit: filters.limit || 10,
      offset: filters.offset || 0,
    });

    //  optional filters
    if (filters.country_code)
      params.append("country_code", filters.country_code);
    if (filters.provider) params.append("provider", filters.provider);
    if (filters.feed_references && Array.isArray(filters.feed_references)) {
      filters.feed_references.forEach((ref) =>
        params.append("feed_references", ref)
      );
    }
    if (filters.data_type) params.append("data_type", filters.data_type);

    // Remove undefined/null parameters
    for (const [key, value] of params.entries()) {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      }
    }

    console.log(
      `Discovering GTFS-RT feeds with filters:`,
      Object.fromEntries(params)
    );

    const response = await axios.get(`${MOBILITY_BASE_URL}/gtfs_rt_feeds`, {
      params,
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000,
    });

    const feeds = response.data;

    if (!Array.isArray(feeds)) {
      throw new Error("Invalid response format from Mobility Database API");
    }

    console.log(`Found ${feeds.length} GTFS-RT feeds`);

    // Normalize all feeds to consistent format
    let normalizedFeeds = feeds.map(normalizeFeedResponse);

    // Filter for public feeds only (authentication_type = 0) if requested
    if (filters.auth_type === 0) {
      normalizedFeeds = normalizedFeeds.filter(
        (feed) => !feed.sourceInfo || feed.sourceInfo.authenticationType === 0
      );
      console.log(
        `Filtered to ${normalizedFeeds.length} public feeds (no authentication required)`
      );
    }

    return normalizedFeeds;
  } catch (error) {
    console.error("Error discovering GTFS-RT feeds:", error.message);

    if (error.response) {
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
      throw new Error(`Failed to discover GTFS-RT feeds: ${error.message}`);
    }
  }
}

/**
 * Find realtime feed(s) for a specific static GTFS feed
 * @param {string} staticFeedId - The static GTFS feed ID (e.g., "mdb-36")
 * @returns {Promise<Array>} Array of matching realtime feeds
 */
async function findRealtimeFeedsForStaticFeed(staticFeedId) {
  try {
    if (!staticFeedId) {
      throw new Error("Static feed ID is required");
    }

    console.log(`Finding realtime feeds for static feed: ${staticFeedId}`);

    // Query realtime feeds that reference this static feed
    // Default to public feeds only (no authentication required)
    const realtimeFeeds = await discoverRealtimeFeeds({
      feed_references: [staticFeedId],
      limit: 10,
      auth_type: 0, // Only public feeds
    });

    if (realtimeFeeds.length === 0) {
      console.log(
        `No realtime feeds found for static feed ${staticFeedId}. This feed may be static-only.`
      );
    } else {
      console.log(
        `Found ${realtimeFeeds.length} realtime feed(s) for static feed ${staticFeedId}`
      );
    }

    return realtimeFeeds;
  } catch (error) {
    console.error(
      `Error finding realtime feeds for ${staticFeedId}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Get a specific realtime feed by ID
 *  @param {string} realtimeFeedId - The realtime feed ID (e.g., "mdb-35")
 * @returns {Promise<Object>} Realtime feed information
 */
async function getRealtimeFeedById(realtimeFeedId) {
  try {
    if (!realtimeFeedId) {
      throw new Error("Realtime feed ID is required");
    }

    const token = await getAccessToken();
    if (!token) {
      throw new Error(
        "Failed to obtain access token for Mobility Database API"
      );
    }

    console.log(`Fetching realtime feed: ${realtimeFeedId}`);

    const response = await axios.get(
      `${MOBILITY_BASE_URL}/gtfs_rt_feeds/${realtimeFeedId}`,
      {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000,
      }
    );

    const feed = response.data;

    if (!feed || !feed.id) {
      throw new Error(`Realtime feed with ID '${realtimeFeedId}' not found`);
    }

    console.log(
      `Successfully retrieved realtime feed: ${feed.id} - ${
        feed.provider || "Unknown"
      }`
    );

    // Normalize feed response
    return normalizeFeedResponse(feed);
  } catch (error) {
    console.error(
      `Error getting realtime feed ${realtimeFeedId}:`,
      error.message
    );

    if (error.response) {
      if (error.response.status === 401) {
        throw new Error(
          "Authentication failed with Mobility Database API. Token may be expired."
        );
      } else if (error.response.status === 403) {
        throw new Error(
          "Access forbidden to Mobility Database API. Check your permissions."
        );
      } else if (error.response.status === 404) {
        throw new Error(`Realtime feed with ID '${realtimeFeedId}' not found`);
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
      throw new Error(`Failed to get realtime feed: ${error.message}`);
    }
  }
}

/**
 * Get realtime data from a GTFS-RT feed URL
 * @param {string} feedUrl - The URL of the realtime feed (usually a .pb or protobuf endpoint)
 * @returns {Promise<Buffer>} Raw protobuf data
 */
async function fetchRealtimeData(feedUrl) {
  try {
    if (!feedUrl) {
      throw new Error("Feed URL is required");
    }

    console.log(`Fetching realtime data from: ${feedUrl}`);

    // GTFS-RT feeds are usually Protocol Buffer format
    const response = await axios.get(feedUrl, {
      responseType: "arraybuffer",
      timeout: 15000, // Realtime feeds should respond quickly
      headers: {
        "User-Agent": "SafeComm-Transit-Backend/1.0",
      },
    });

    console.log(
      `Successfully fetched realtime data (${response.data.length} bytes)`
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error("Error fetching realtime data:", error.message);

    if (error.response) {
      throw new Error(
        `Failed to fetch realtime feed: ${error.response.status} - ${error.response.statusText}`
      );
    } else if (error.code === "ECONNREFUSED") {
      throw new Error(
        "Cannot connect to realtime feed URL. Check your internet connection."
      );
    } else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      throw new Error(
        "Realtime feed request timed out. Feed may be unavailable."
      );
    } else {
      throw new Error(`Failed to fetch realtime data: ${error.message}`);
    }
  }
}

/**
 * Get realtime feed information with source URLs
 * @param {string} realtimeFeedId - The realtime feed ID
 * @returns {Promise<Object>} Feed info with available URLs
 */
async function getRealtimeFeedUrls(realtimeFeedId) {
  try {
    const feed = await getRealtimeFeedById(realtimeFeedId);

    const urls = {
      id: feed.id,
      provider: feed.provider,
      feedName: feed.feedName,
      staticFeedReferences: feed.staticFeedReferences || [],
      entityTypes: feed.entityTypes || [],
      realtimeUrls: [],
      sourceInfo: null,
    };

    // Extract producer URL from source_info (the actual download URL)
    if (feed.sourceInfo) {
      urls.sourceInfo = {
        producerUrl: feed.sourceInfo.producerUrl,
        authenticationType: feed.sourceInfo.authenticationType,
        authenticationInfoUrl: feed.sourceInfo.authenticationInfoUrl,
        apiKeyParameterName: feed.sourceInfo.apiKeyParameterName,
        licenseUrl: feed.sourceInfo.licenseUrl,
      };

      // Only include URLs that don't require authentication (authentication_type = 0)
      if (
        feed.sourceInfo.producerUrl &&
        feed.sourceInfo.authenticationType === 0
      ) {
        urls.realtimeUrls.push({
          url: feed.sourceInfo.producerUrl,
          type: feed.entityTypes?.[0] || "unknown", // Primary entity type
          authentication: feed.sourceInfo.authenticationType || 0,
          description: `Primary feed for ${feed.feedName || feed.provider}`,
        });
      }
    }

    // Extract URLs from realtime sources (if available) - only public ones
    if (feed.realtimeSources && Array.isArray(feed.realtimeSources)) {
      feed.realtimeSources.forEach((source) => {
        if (source.source_url && source.authentication_type === 0) {
          urls.realtimeUrls.push({
            url: source.source_url,
            type: source.source_type || "unknown",
            authentication: source.authentication_type || 0,
          });
        }
      });
    }

    console.log(
      `Realtime URLs for ${realtimeFeedId}:`,
      urls.realtimeUrls.length,
      "endpoint(s) - filtered for public access only"
    );

    return urls;
  } catch (error) {
    console.error(
      `Error getting realtime feed URLs for ${realtimeFeedId}:`,
      error.message
    );
    throw error;
  }
}

module.exports = {
  discoverRealtimeFeeds,
  findRealtimeFeedsForStaticFeed,
  getRealtimeFeedById,
  fetchRealtimeData,
  getRealtimeFeedUrls,
};
