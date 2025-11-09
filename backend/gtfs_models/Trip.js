const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema({
  feedId: String,
  route_id: { type: String, index: true },
  service_id: String,
  trip_id: { type: String, required: true, index: true },
  trip_headsign: String,
  trip_short_name: String,
  direction_id: Number,
  block_id: String,
  shape_id: String,
  wheelchair_accessible: Number,
});

const TripModel = mongoose.model("Trip", TripSchema);
module.exports = TripModel;