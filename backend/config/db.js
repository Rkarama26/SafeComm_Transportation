const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri =
      process.env.NODE_ENV === "test"
        ? process.env.MONGO_URI_TEST
        : process.env.MONGO_URI_CLOUD;

    const conn = await mongoose.connect(uri);

    const dbEnv = process.env.NODE_ENV || "development";
    const dbName = conn.connection.name;

    console.log(` MongoDB Connected to Database: ${dbName}`);

    // Ensure geospatial indexes are created
    await createGeospatialIndexes();
  } catch (error) {
    console.error(` MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Create geospatial indexes for GTFS models
const createGeospatialIndexes = async () => {
  try {
    console.log(" Ensuring geospatial indexes...");

    // Import models after connection to ensure indexes are created
    const StopModel = require("../static_gtfs_models/Stop.js");

    // The index is now defined in the schema, but we can ensure it's built
    await StopModel.ensureIndexes();

    console.log(" Geospatial indexes ensured successfully");
  } catch (error) {
    console.error(" Error ensuring geospatial indexes:", error.message);
  }
};

module.exports = { connectDB };
