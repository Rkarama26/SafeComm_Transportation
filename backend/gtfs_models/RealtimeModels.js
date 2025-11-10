const mongoose = require("mongoose");

// Schema for realtime URLs
const RealtimeUrlSchema = new mongoose.Schema(
  {
    url: String,
    type: String, // trip_update, vehicle_position, service_alert
    authentication: Number,
  },
  { _id: false }
); // Don't create _id for subdocuments

// Schema for storing realtime feed metadata
const RealtimeFeedMetadataSchema = new mongoose.Schema({
  realtimeFeedId: { type: String, required: true, unique: true, index: true },
  staticFeedReferences: [String], // IDs of associated static feeds , will be used to link static and realtime feeds
  provider: String,
  country: String,
  entityTypes: [String], // ["vp", "tu", "sa"] etc
  realtimeUrls: [RealtimeUrlSchema],
  lastUpdated: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Add TTL index for automatic deletion after 1 week (604800 seconds)
RealtimeFeedMetadataSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 604800 }
);

// Schema for storing vehicle positions (realtime)
const VehiclePositionSchema = new mongoose.Schema({
  realtimeFeedId: String,
  staticFeedId: String,
  vehicleId: String,
  tripId: String,
  routeId: String,
  latitude: Number,
  longitude: Number,
  bearing: Number, // Direction in degrees
  speed: Number, // m/s
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: [Number], // [longitude, latitude]
  },
  currentStopSequence: Number, // Current stop sequence in the trip
  stopId: String, // ID of the current/next stop
  currentStatus: {
    type: String,
    enum: ["IN_TRANSIT_TO", "STOPPED_AT", "INCOMING_AT"],
  }, // Vehicle status
  congestionLevel: {
    type: String,
    enum: [
      "UNKNOWN_CONGESTION_LEVEL",
      "RUNNING_SMOOTHLY",
      "STOP_AND_GO",
      "CONGESTION",
      "SEVERE_CONGESTION",
    ],
  }, // Traffic congestion
  occupancyStatus: {
    type: String,
    enum: [
      "EMPTY",
      "MANY_SEATS_AVAILABLE",
      "FEW_SEATS_AVAILABLE",
      "STANDING_ROOM_ONLY",
      "CRUSHED_STANDING_ROOM_ONLY",
      "FULL",
      "NOT_ACCEPTING_PASSENGERS",
    ],
  }, // Passenger occupancy
  occupancyPercentage: Number, // Occupancy as percentage (0-100)
  timestamp: { type: Date, default: Date.now },
  updateId: { type: String, unique: true, sparse: true }, // Track update uniqueness
});

// Create 2dsphere index for geospatial queries
VehiclePositionSchema.index({ location: "2dsphere" });
VehiclePositionSchema.index({ realtimeFeedId: 1, timestamp: -1 });
VehiclePositionSchema.index({ tripId: 1 });
VehiclePositionSchema.index({ routeId: 1 });
VehiclePositionSchema.index({ stopId: 1 });
VehiclePositionSchema.index({ currentStatus: 1 });
VehiclePositionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 3600 }); // Auto-expire after 1 hour

// Schema for storing trip updates (delays, cancellations, etc)
const TripUpdateSchema = new mongoose.Schema({
  realtimeFeedId: String,
  staticFeedId: String,
  tripId: { type: String, index: true },
  routeId: String,
  status: String, // SCHEDULED, ADDED, CANCELED
  delay: Number, // seconds
  timestamp: { type: Date, default: Date.now },
  stopTimeUpdates: [
    {
      stopId: String,
      arrival: {
        time: Date,
        delay: Number,
        uncertainty: Number,
      },
      departure: {
        time: Date,
        delay: Number,
        uncertainty: Number,
      },
      stopSequence: Number,
    },
  ],
  updateId: { type: String, unique: true, sparse: true },
});

TripUpdateSchema.index({ realtimeFeedId: 1, timestamp: -1 });
TripUpdateSchema.index({ timestamp: 1 }, { expireAfterSeconds: 3600 }); // Auto-expire

// Schema for storing service alerts
const ServiceAlertSchema = new mongoose.Schema({
  realtimeFeedId: String,
  staticFeedId: String,
  alertId: String,
  affectedRoutes: [String],
  affectedStops: [String],
  cause: String, // TECHNICAL_PROBLEM, STRIKE, etc
  effect: String, // NO_SERVICE, REDUCED_SERVICE, SIGNIFICANT_DELAYS, etc
  headerText: String,
  descriptionText: String,
  url: String,
  activePeriods: [
    {
      start: Date,
      end: Date,
    },
  ],
  severity: { type: String, enum: ["INFO", "WARNING", "ALERT"] },
  timestamp: { type: Date, default: Date.now },
  updateId: { type: String, unique: true, sparse: true },
});

ServiceAlertSchema.index({ realtimeFeedId: 1 });
ServiceAlertSchema.index({ affectedRoutes: 1 });
ServiceAlertSchema.index({ affectedStops: 1 });

// Schema for tracking realtime feed updates
const RealtimeFeedUpdateLogSchema = new mongoose.Schema({
  realtimeFeedId: String,
  staticFeedId: String,
  timestamp: { type: Date, default: Date.now },
  vehiclePositionsCount: Number,
  tripUpdatesCount: Number,
  serviceAlertsCount: Number,
  lastDataFetch: Date,
  status: { type: String, enum: ["SUCCESS", "FAILED", "TIMEOUT"] },
  errorMessage: String,
  durationMs: Number, // Time taken to fetch and process
});

RealtimeFeedUpdateLogSchema.index({ realtimeFeedId: 1, timestamp: -1 });
RealtimeFeedUpdateLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 604800 }
); // Keep for 7 days

const RealtimeFeedMetadataModel = mongoose.model(
  "RealtimeFeedMetadata",
  RealtimeFeedMetadataSchema
);
const VehiclePositionModel = mongoose.model(
  "VehiclePosition",
  VehiclePositionSchema
);
const TripUpdateModel = mongoose.model("TripUpdate", TripUpdateSchema);
const ServiceAlertModel = mongoose.model("ServiceAlert", ServiceAlertSchema);
const RealtimeFeedUpdateLogModel = mongoose.model(
  "RealtimeFeedUpdateLog",
  RealtimeFeedUpdateLogSchema
);

module.exports = {
  RealtimeFeedMetadataModel,
  VehiclePositionModel,
  TripUpdateModel,
  ServiceAlertModel,
  RealtimeFeedUpdateLogModel,
};
