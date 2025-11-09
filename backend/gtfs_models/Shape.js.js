const mongoose = require("mongoose");

const ShapeSchema = new mongoose.Schema({
  feedId: String,
  shape_id: { type: String, index: true },
  geometry: {
    type: { type: String, default: "LineString" },
    coordinates: [[Number]], // [[lon, lat], ...]
  },
});

const ShapeModel = mongoose.model("Shape", ShapeSchema);
module.exports = ShapeModel;