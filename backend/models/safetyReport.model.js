const mongoose = require("mongoose");
const safetyReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
    location: {
      lat: { type: Number },
      lon: { type: Number },
    },
    status: {
      type: String,
      enum: ["open", "reviewed", "resolved"],
      default: "open",
    },
  },
  { timestamps: true }
);

const SafetyReportModel = mongoose.model("SafetyReport", safetyReportSchema);

module.exports = SafetyReportModel;
