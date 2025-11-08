const mongoose = require("mongoose");

const StopSchema = new mongoose.Schema({
  feedId: String,
  stop_id: { type: String, required: true, index: true },
  stop_code: String,
  stop_name: String,
  stop_desc: String,
  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], index: "2dsphere" }, // [lon, lat]
  },
  zone_id: String,
  stop_url: String,
  location_type: Number,
  parent_station: String,
  wheelchair_boarding: Number,
});

const StopModel = mongoose.model("Stop", StopSchema);
module.exports = StopModel;