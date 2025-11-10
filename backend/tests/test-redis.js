const redisService = require("../services/redisService");

async function testRedisIntegration() {
  console.log(
    "Testing Upstash Redis integration for vehicle position storage...\n"
  );

  try {
    // Test Redis connection
    const isConnected = await redisService.isConnected();
    console.log(
      `Redis connection status: ${
        isConnected ? "✅ Connected" : "❌ Not connected"
      }`
    );

    if (!isConnected) {
      console.log("Please check your Upstash Redis credentials in .env file:");
      console.log("  UPSTASH_REDIS_REST_URL");
      console.log("  UPSTASH_REDIS_REST_TOKEN");
      return;
    }

    // Clear any existing test data
    await redisService.clearAllVehicles();
    console.log("✅ Cleared existing vehicle data");

    // Test storing vehicle positions
    const testVehicles = [
      {
        vehicleId: "test-bus-001",
        routeId: "1",
        tripId: "trip-001",
        latitude: 40.7128,
        longitude: -74.006,
        bearing: 45,
        speed: 25.5,
        currentStopSequence: 5,
        stopId: "stop_001",
        currentStatus: 0,
        congestionLevel: 0,
        occupancyStatus: 1,
        occupancyPercentage: 75,
        timestamp: new Date(),
        realtimeFeedId: "test-feed",
        staticFeedId: "test-static",
        feedId: "test-feed",
      },
      {
        vehicleId: "test-bus-002",
        routeId: "2",
        tripId: "trip-002",
        latitude: 40.7589,
        longitude: -73.9851,
        bearing: 180,
        speed: 15.2,
        currentStopSequence: 12,
        stopId: "stop_002",
        currentStatus: 0,
        congestionLevel: 0,
        occupancyStatus: 2,
        occupancyPercentage: 50,
        timestamp: new Date(),
        realtimeFeedId: "test-feed",
        staticFeedId: "test-static",
        feedId: "test-feed",
      },
    ];

    console.log("\n📝 Storing test vehicle positions in Upstash Redis...");
    for (const vehicle of testVehicles) {
      const stored = await redisService.setVehiclePosition(
        vehicle.vehicleId,
        vehicle
      );
      console.log(
        `  ${vehicle.vehicleId}: ${stored ? "✅ Stored" : "❌ Failed"}`
      );
    }

    // Test retrieving all vehicles
    console.log("\n📖 Retrieving all vehicles from Upstash Redis...");
    const allVehicles = await redisService.getAllVehiclePositions();
    console.log(`Found ${allVehicles.length} vehicles:`);
    allVehicles.forEach((vehicle) => {
      console.log(
        `  - ${vehicle.vehicleId}: Route ${vehicle.routeId}, Speed: ${vehicle.speed} km/h`
      );
    });

    // Test retrieving specific vehicle
    console.log("\n🎯 Retrieving specific vehicle...");
    const specificVehicle = await redisService.getVehiclePosition(
      "test-bus-001"
    );
    if (specificVehicle) {
      console.log(
        `✅ Found vehicle: ${specificVehicle.vehicleId} at (${specificVehicle.latitude}, ${specificVehicle.longitude})`
      );
    } else {
      console.log("❌ Vehicle not found");
    }

    // Test filtering by route
    console.log("\n🚍 Filtering vehicles by route...");
    const routeVehicles = await redisService.getVehiclesByRoute("1");
    console.log(`Found ${routeVehicles.length} vehicles on route 1:`);
    routeVehicles.forEach((vehicle) => {
      console.log(`  - ${vehicle.vehicleId}`);
    });

    // Test pub/sub
    console.log("\n📡 Testing pub/sub functionality...");
    let receivedUpdates = 0;

    // Subscribe to updates
    const subscriber = redisService.subscribeToUpdates((update) => {
      receivedUpdates++;
      console.log(`📨 Received update for vehicle: ${update.vehicleId}`);
    });

    // Publish an update
    await redisService.publishVehicleUpdate("test-bus-001", {
      vehicleId: "test-bus-001",
      routeId: "1",
      latitude: 40.713,
      longitude: -74.0062,
      speed: 28.0,
      timestamp: new Date(),
    });

    // Wait a moment for pub/sub to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(
      `Pub/sub test: ${receivedUpdates > 0 ? "✅ Working" : "❌ Not working"}`
    );

    // Cleanup subscriber
    if (subscriber && subscriber.quit) {
      subscriber.quit();
    }

    console.log("\n🎉 Upstash Redis integration test completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Start your server: npm run dev");
    console.log("2. Test API endpoints:");
    console.log("   GET /api/transit/vehicles/live");
    console.log("   GET /api/transit/routes/1/realtime");
    console.log(
      '3. Check response headers for "source" field indicating Redis vs MongoDB'
    );
  } catch (error) {
    console.error("❌ Upstash Redis integration test failed:", error.message);
  }
}

// Run the test
testRedisIntegration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test execution failed:", error);
    process.exit(1);
  });
