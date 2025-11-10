const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

// Test the websocket flow
(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/safecomm"
    );
    console.log("✓ Connected to MongoDB");

    const { VehiclePositionModel } = require("./gtfs_models/RealtimeModels");

    // Check vehicles in MongoDB
    const allVehicles = await VehiclePositionModel.find().limit(5).lean();
    console.log(
      `\n✓ Total vehicles in DB: ${await VehiclePositionModel.countDocuments()}`
    );

    // Check recent vehicles (last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentVehicles = await VehiclePositionModel.find({
      createdAt: { $gte: tenMinutesAgo },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log(`✓ Vehicles from last 10 minutes: ${recentVehicles.length}`);

    if (recentVehicles.length > 0) {
      console.log("\n✓ Sample vehicle data:");
      const vehicle = recentVehicles[0];
      console.log(`  - ID: ${vehicle.vehicleId}`);
      console.log(`  - Route: ${vehicle.routeId}`);
      console.log(`  - Position: ${vehicle.latitude}, ${vehicle.longitude}`);
      console.log(`  - Feed: ${vehicle.realtimeFeedId}`);
      console.log(`  - Created: ${vehicle.createdAt}`);
    } else {
      console.log("✗ NO RECENT VEHICLES FOUND - This is the problem!");
      console.log(
        "  Check if the realtime cron job is running and storing data"
      );
    }

    await mongoose.disconnect();
    console.log("\n✓ Disconnected from MongoDB");
  } catch (error) {
    console.error("✗ Error:", error.message);
    process.exit(1);
  }
})();
