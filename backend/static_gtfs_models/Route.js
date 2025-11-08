const mongoose = require("mongoose");

const RouteSchema = new mongoose.Schema({
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

const RouteModel = mongoose.model("Route", RouteSchema);

module.exports = RouteModel;   
 