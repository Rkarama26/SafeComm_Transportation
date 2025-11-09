const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route", // Relation to Route
      required: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lon: {
      type: Number,
      required: true,
    },
    speed: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["running", "stopped", "offline"],
      default: "running",
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

const VehicleModel = mongoose.model("Vehicle", vehicleSchema);
module.exports = VehicleModel;
