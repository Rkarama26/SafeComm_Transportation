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

    console.log(` MongoDB Connected: ${dbName}`);
  } catch (error) {
    console.error(` MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };
