#!/usr/bin/env node

/**
 * Quick test script to verify GTFS-RT service integration
 * FOCUS: Public feeds only (authentication_type = 0)
 * Usage: node test-realtime.js
 */

require("dotenv").config();
const gtfsRealtimeService = require("./services/gtfsRealtimeService");

async function runTests() {
  console.log("GTFS-RT Service Test Suite\n");

  try {
    // Test 1: Discover realtime feeds (public only)
    console.log("Test 1: Discovering PUBLIC GTFS-RT feeds (US, limit 5)...");
    const discovered = await gtfsRealtimeService.discoverRealtimeFeeds({
      country_code: "US",
      limit: 5,
      auth_type: 0, // Only public feeds
    });
    console.log(`Found ${discovered.length} public feeds\n`);
    if (discovered.length > 0) {
      console.log("Sample public feed:");
      console.log(JSON.stringify(discovered[0], null, 2));
    }

    // Test 2: Find realtime for LADOT (static feed)
    console.log("\nTest 2: Finding realtime for LADOT static feed (mdb-20)...");
    const ladotRealtime =
      await gtfsRealtimeService.findRealtimeFeedsForStaticFeed("mdb-20");
    console.log(`Found ${ladotRealtime.length} realtime feed(s)`);
    if (ladotRealtime.length > 0) {
      console.log(JSON.stringify(ladotRealtime[0], null, 2));
    }

    // Test 3: Get LADOT realtime feed details
    console.log("\nTest 3: Getting LADOT realtime feed details (mdb-1210)...");
    const ladotFeed = await gtfsRealtimeService.getRealtimeFeedById("mdb-1210");
    console.log("Feed details:");
    console.log(JSON.stringify(ladotFeed, null, 2));

    // Test 4: Get MTA realtime URLs (should be public)
    console.log(
      "\nTest 4: Getting MTA realtime feed URLs (should be public)..."
    );
    const mtaUrls = await gtfsRealtimeService.getRealtimeFeedUrls("mdb-1634");
    console.log("MTA URLs (filtered for public access):");
    console.log(JSON.stringify(mtaUrls, null, 2));

    // Test 5: Try BART if available
    console.log("\nTest 5: Finding realtime for BART static feed (mdb-36)...");
    const bartRealtime =
      await gtfsRealtimeService.findRealtimeFeedsForStaticFeed("mdb-36");
    console.log(`Found ${bartRealtime.length} realtime feed(s)`);
    if (bartRealtime.length > 0) {
      console.log(JSON.stringify(bartRealtime[0], null, 2));
    }

    console.log("All tests completed successfully!");
  } catch (error) {
    console.error("Test failed:");
    console.error(error.message);
    if (error.response?.data) {
      console.error("Response data:", error.response.data);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = runTests;
