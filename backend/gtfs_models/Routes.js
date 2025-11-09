const mongoose = require("mongoose");

const RoutesSchema = new mongoose.Schema({
  feedId: String,
  route_id: { type: String, required: true, index: true },
  agency_id: String,
  route_short_name: String,
  route_long_name: String,
  route_desc: String,
  route_type: Number,
  route_color: String,
  route_text_color: String,
});

const RoutesModel = mongoose.model("GtfsRoute", RoutesSchema);

module.exports = RoutesModel;   
 