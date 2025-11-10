const gtfsRealtimeService = require("../services/gtfsRealtimeService");
const gtfsRealtimeParser = require("../services/gtfsRealtimeParser");
const {
  RealtimeFeedUpdateLogModel,
  RealtimeFeedMetadataModel,
} = require("../gtfs_models/RealtimeModels");
const websocketService = require("../services/websocketService");

class RealtimeUpdateScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
    this.activeFeeds = [];
    this.lastFetchTime = {};
    this.errorCount = {};
    this.MAX_RETRIES = 1; // Only try once per feed, then move to next
    this.FETCH_TIMEOUT = 15000; // 15 seconds per feed
    this.PEAK_HOURS_START = 6; // 6 AM
    this.PEAK_HOURS_END = 22; // 10 PM
    this.OFF_PEAK_INTERVAL = 1 * 60 * 1000; // 5 minutes during off-peak (for easier log checking)
    this.PEAK_INTERVAL = 30 * 1000; // 2 minutes during peak hours (for easier log checking)
  }

  /**
   * Check if current time is during peak hours
   */
  isPeakHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= this.PEAK_HOURS_START && hour < this.PEAK_HOURS_END;
  }

  /**
   * Get appropriate interval based on time of day
   */
  getCurrentInterval() {
    return this.isPeakHours() ? this.PEAK_INTERVAL : this.OFF_PEAK_INTERVAL;
  }

  /**
   * Initialize scheduler
   */
  async initialize() {
    try {
      // Initialize protobuf schema on startup
      await gtfsRealtimeParser.initializeSchema();

      // Load active feeds
      await this.loadActiveFeeds();

      console.log(
        `Realtime scheduler initialized with ${this.activeFeeds.length} feeds`
      );
    } catch (error) {
      console.error("Failed to initialize scheduler:", error.message);
      throw error;
    }
  }

  /**
   * Load list of active feeds to monitor from database
   */
  async loadActiveFeeds() {
    try {
      // Load active feed IDs from database
      const activeFeedDocs = await RealtimeFeedMetadataModel.find({
        isActive: true,
      }).select("realtimeFeedId");

      if (activeFeedDocs.length === 0) {
        console.log("No active feeds configured in database");
        this.activeFeeds = [];
        return;
      }

      const feedIds = activeFeedDocs.map((doc) => doc.realtimeFeedId);
      console.log(
        `Loading ${feedIds.length} active feeds: ${feedIds.join(", ")}`
      );

      // Get current feed details from API for each feed ID
      const feeds = [];
      for (const feedId of feedIds) {
        try {
          const feed = await gtfsRealtimeService.getRealtimeFeedById(feedId);

          // Filter for feeds with vehicle positions and public access
          if (
            feed.entityTypes &&
            feed.entityTypes.includes("vp") &&
            feed.sourceInfo &&
            feed.sourceInfo.authenticationType === 0
          ) {
            feeds.push(feed);
          } else {
            console.warn(
              `Skipping feed ${feedId}: missing vp entity type or requires authentication`
            );
          }
        } catch (error) {
          console.error(`Failed to load feed ${feedId}:`, error.message);
        }
      }

      this.activeFeeds = feeds;

      console.log(
        `Loaded ${this.activeFeeds.length} active realtime feeds from database`
      );

      // Log feed details for debugging
      this.activeFeeds.forEach((feed) => {
        console.log(
          `  - ${feed.id}: ${feed.provider} (${feed.entityTypes.join(", ")})`
        );
      });
    } catch (error) {
      console.error("Error loading active feeds:", error.message);
      this.activeFeeds = [];
    }
  }

  /**
   * Fetch data for a single feed with timeout
   */
  async fetchFeedData(feed, timeout = this.FETCH_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const urls = await gtfsRealtimeService.getRealtimeFeedUrls(feed.id);

      if (!urls.realtimeUrls || urls.realtimeUrls.length === 0) {
        return null; // No public URLs available
      }

      const url = urls.realtimeUrls[0].url;
      const protoData = await gtfsRealtimeService.fetchRealtimeData(url);

      clearTimeout(timeoutId);
      return { url, protoData, urls };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Process single feed - try once, then move to next feed
   */
  async processFeed(feed) {
    const feedId = feed.id;
    const startTime = Date.now();

    try {
      const feedData = await this.fetchFeedData(feed);

      if (!feedData) {
        // No public URLs available
        this.errorCount[feedId] = 0;
        return {
          feedId,
          status: "skipped",
          reason: "no_public_urls",
          duration: Date.now() - startTime,
        };
      }

      // Parse protobuf data with error handling
      let parsedData;
      try {
        parsedData = await gtfsRealtimeParser.parseRealtimeData(
          feedData.protoData,
          feedId,
          feed.staticFeedReferences?.[0]
        );
      } catch (parseError) {
        // If parsing fails, skip this feed
        console.warn(
          `Parsing failed for ${feedId}, skipping:`,
          parseError.message
        );
        throw new Error(`Parse failed: ${parseError.message}`);
      }

      // Store in database with error handling
      let storeStats;
      try {
        storeStats = await gtfsRealtimeParser.storeParsedData(
          parsedData,
          feedId,
          feed.staticFeedReferences?.[0]
        );
      } catch (storeError) {
        console.error(`Storage failed for ${feedId}:`, storeError.message);
        throw new Error(`Storage failed: ${storeError.message}`);
      }

      console.log(`Stored data for ${feedId}:`, storeStats);

      // Notify WebSocket clients of new data
      if (storeStats.vehiclesUpserted > 0) {
        websocketService.notifyNewDataAvailable(
          feedId,
          storeStats.vehiclesUpserted
        );
      }

      // Log successful update
      try {
        await RealtimeFeedUpdateLogModel.create({
          realtimeFeedId: feedId,
          staticFeedId: feed.staticFeedReferences?.[0],
          status: "SUCCESS",
          vehiclePositionsCount: parsedData.stats.vehiclePositions,
          tripUpdatesCount: parsedData.stats.tripUpdates,
          serviceAlertsCount: parsedData.stats.alerts,
          lastDataFetch: new Date(),
          durationMs: Date.now() - startTime,
          timestamp: new Date(),
        });
      } catch (logError) {
        console.warn(`Failed to log success for ${feedId}:`, logError.message);
      }

      // Reset error count on success
      this.errorCount[feedId] = 0;
      this.lastFetchTime[feedId] = Date.now();

      return {
        feedId,
        status: "success",
        vehicles: parsedData.stats.vehiclePositions,
        tripUpdates: parsedData.stats.tripUpdates,
        alerts: parsedData.stats.alerts,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.warn(`Feed ${feedId} failed:`, error.message);

      // Increment error count
      this.errorCount[feedId] = (this.errorCount[feedId] || 0) + 1;

      // Log failure
      try {
        await RealtimeFeedUpdateLogModel.create({
          realtimeFeedId: feedId,
          staticFeedId: feed.staticFeedReferences?.[0],
          status: "FAILED",
          errorMessage: error.message || "Unknown error",
          durationMs: Date.now() - startTime,
          timestamp: new Date(),
        });
      } catch (logError) {
        console.error("Failed to log error:", logError.message);
      }

      return {
        feedId,
        status: "error",
        error: error.message || "Unknown error",
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Main scheduler task - runs every 2-5 minutes based on time of day
   */
  async executeUpdate() {
    if (this.isRunning) {
      console.warn("Scheduler already running, skipping this cycle");
      return;
    }

    this.isRunning = true;
    const cycleStart = Date.now();

    try {
      const isPeak = this.isPeakHours();
      console.log(
        `[${new Date().toISOString()}] Starting realtime update cycle for ${
          this.activeFeeds.length
        } feeds (${isPeak ? "peak" : "off-peak"} hours)`
      );

      // Process feeds in parallel batches (4 at a time to avoid overwhelming DB)
      const batchSize = 4;
      const results = [];

      for (let i = 0; i < this.activeFeeds.length; i += batchSize) {
        const batch = this.activeFeeds.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map((feed) => this.processFeed(feed))
        );

        results.push(
          ...batchResults.map((r) =>
            r.status === "fulfilled"
              ? r.value
              : { status: "error", reason: r.reason }
          )
        );
      }

      // Summary stats
      const stats = {
        successful: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "error").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        totalVehicles: results.reduce((sum, r) => sum + (r.vehicles || 0), 0),
        totalTrips: results.reduce((sum, r) => sum + (r.tripUpdates || 0), 0),
        totalAlerts: results.reduce((sum, r) => sum + (r.alerts || 0), 0),
        duration: Date.now() - cycleStart,
      };

      console.log(
        `[${new Date().toISOString()}] Cycle complete (${
          isPeak ? "peak" : "off-peak"
        }): ${stats.successful} success, ${stats.failed} errors, ${
          stats.skipped
        } skipped | ${stats.totalVehicles} vehicles, ${
          stats.totalTrips
        } trips, ${stats.totalAlerts} alerts | ${stats.duration}ms`
      );

      // Periodically reload active feeds (every 60 cycles = 30 minutes during peak, 12 cycles = 1 hour during off-peak)
      const reloadThreshold = isPeak ? 60 : 12;
      if (results.length % reloadThreshold === 0) {
        await this.loadActiveFeeds();
      }
    } catch (error) {
      console.error("Scheduler cycle error:", error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the scheduler - runs based on time of day
   */
  start() {
    if (this.task) {
      return;
    }

    // Start with immediate execution for testing
    console.log("Starting immediate test execution...");
    this.executeUpdate().catch((error) => {
      console.error("Immediate execution error:", error.message);
    });

    // Then schedule next run
    this.scheduleNextRun();

    console.log(
      "Realtime update scheduler started (time-based: 2min peak, 5min off-peak)"
    );
  }

  /**
   * Schedule the next run based on current time
   */
  scheduleNextRun() {
    if (this.task) {
      clearTimeout(this.task);
    }

    const interval = this.getCurrentInterval();
    const isPeak = this.isPeakHours();

    console.log(
      `[${new Date().toISOString()}] Next run in ${interval / 1000}s (${
        isPeak ? "peak" : "off-peak"
      } hours)`
    );

    this.task = setTimeout(async () => {
      try {
        await this.executeUpdate();
      } catch (error) {
        console.error("Scheduler execution error:", error.message);
      }

      // Schedule next run
      this.scheduleNextRun();
    }, interval);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      clearTimeout(this.task);
      this.task = null;
      console.log("Realtime update scheduler stopped");
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeFeeds: this.activeFeeds.length,
      lastFetch: this.lastFetchTime,
      errorCounts: this.errorCount,
    };
  }
}

// Export singleton instance
module.exports = new RealtimeUpdateScheduler();
