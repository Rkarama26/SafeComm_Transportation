const mongoose = require("mongoose");

const StopSchema = new mongoose.Schema({
  feedId: String,
  stop_id: { type: String, required: true, index: true },
  stop_code: String,
  stop_name: String,
  stop_desc: String,
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  zone_id: String,
  stop_url: String,
  location_type: Number,
  parent_station: String,
  wheelchair_boarding: Number,
});

// Create 2dsphere index on location field
StopSchema.index({ location: "2dsphere" });

const StopModel = mongoose.model("Stop", StopSchema);
module.exports = StopModel;
