const mongoose = require("mongoose");

const DirectionSchema = new mongoose.Schema({
  feedId: String,
  route_id: { type: String, index: true },
  direction_id: Number,
  direction: String,
});

const DirectionModel = mongoose.model("GtfsDirection", DirectionSchema, "gtfs_directions");
module.exports = DirectionModel;
