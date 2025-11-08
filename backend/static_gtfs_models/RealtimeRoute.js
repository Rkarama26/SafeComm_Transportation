const mongoose = require("mongoose");

const RealtimeRouteSchema = new mongoose.Schema({
  feedId: String,
  route_id: { type: String, index: true },
  realtime_enabled: { type: Boolean, default: false },
});

const RealtimeRouteModel = mongoose.model(
  "GtfsRealtimeRoute",
  RealtimeRouteSchema,
  "gtfs_realtime_routes"
); 

module.exports = RealtimeRouteModel;
