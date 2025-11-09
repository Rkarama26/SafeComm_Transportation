const mongoose = require("mongoose");

const StopTimeSchema = new mongoose.Schema({
  feedId: String,
  trip_id: { type: String, index: true },
  arrival_time: String,
  departure_time: String,
  stop_id: { type: String, index: true },
  stop_sequence: Number,
  stop_headsign: String,
  pickup_type: Number,
  drop_off_type: Number,
  shape_dist_traveled: Number,
  timepoint: Number,
});

StopTimeSchema.index({ trip_id: 1, stop_sequence: 1 });

const StopTimeModel = mongoose.model("StopTime", StopTimeSchema);

module.exports = StopTimeModel;
