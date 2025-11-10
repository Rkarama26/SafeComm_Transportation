const GtfsRealtimeBindings = require("gtfs-realtime-bindings");
const redisService = require("./redisService");
const {
  VehiclePositionModel,
  TripUpdateModel,
  ServiceAlertModel,
} = require("../gtfs_models/RealtimeModels");

/**
 * Initialize protobuf schema (no longer needed with gtfs-realtime-bindings)
 */
async function initializeSchema() {
  // gtfs-realtime-bindings handles this automatically
  console.log("GTFS-RT bindings initialized");
}

/**
 * Parse vehicle position from protobuf entity using gtfs-realtime-bindings
 */
function parseVehiclePosition(entity, realtimeFeedId, staticFeedId) {
  if (!entity.vehicle) return null;

  const vp = entity.vehicle;
  const trip = vp.trip;
  const vehicle = vp.vehicle;
  const position = vp.position;

  // Check for position data
  if (
    !position ||
    typeof position.latitude !== "number" ||
    typeof position.longitude !== "number"
  ) {
    return null; // Must have valid position data
  }

  return {
    vehicleId: vehicle?.id || vp.id || `vehicle-${entity.id}`,
    tripId: trip?.tripId,
    routeId: trip?.routeId,
    latitude: position.latitude,
    longitude: position.longitude,
    bearing: position.bearing,
    speed: position.speed,
    currentStopSequence: vp.currentStopSequence,
    stopId: vp.stopId,
    currentStatus: vp.currentStatus,
    timestamp: vp.timestamp ? new Date(vp.timestamp * 1000) : new Date(),
    congestionLevel: vp.congestionLevel,
    occupancyStatus: vp.occupancyStatus,
    occupancyPercentage: vp.occupancyPercentage,
    location: {
      type: "Point",
      coordinates: [position.longitude, position.latitude], // [longitude, latitude] for MongoDB
    },
    realtimeFeedId,
    staticFeedId,
    createdAt: new Date(),
  };
}

/**
 * Parse trip update from protobuf entity using gtfs-realtime-bindings
 */
function parseTripUpdate(entity, realtimeFeedId, staticFeedId) {
  if (!entity.tripUpdate) return null;

  const tu = entity.tripUpdate;
  const trip = tu.trip;

  return {
    tripId: trip?.tripId,
    routeId: trip?.routeId,
    startTime: trip?.startTime,
    startDate: trip?.startDate,
    scheduleRelationship: trip?.scheduleRelationship,
    stopTimeUpdates: tu.stopTimeUpdate
      ? tu.stopTimeUpdate.map((stu) => ({
          stopSequence: stu.stopSequence,
          stopId: stu.stopId,
          arrival: stu.arrival
            ? {
                time: stu.arrival.time
                  ? new Date(stu.arrival.time * 1000)
                  : null,
                delay: stu.arrival.delay,
                uncertainty: stu.arrival.uncertainty,
              }
            : null,
          departure: stu.departure
            ? {
                time: stu.departure.time
                  ? new Date(stu.departure.time * 1000)
                  : null,
                delay: stu.departure.delay,
                uncertainty: stu.departure.uncertainty,
              }
            : null,
          scheduleRelationship: stu.scheduleRelationship,
        }))
      : [],
    vehicle: tu.vehicle
      ? {
          id: tu.vehicle.id,
          label: tu.vehicle.label,
          licensePlate: tu.vehicle.licensePlate,
        }
      : null,
    timestamp: tu.timestamp ? new Date(tu.timestamp * 1000) : new Date(),
    delay: tu.delay,
    realtimeFeedId,
    staticFeedId,
    createdAt: new Date(),
  };
}

/**
 * Parse service alert from protobuf entity using gtfs-realtime-bindings
 */
function parseServiceAlert(entity, realtimeFeedId, staticFeedId) {
  if (!entity.alert) return null;

  const alert = entity.alert;

  return {
    alertId: entity.id,
    activePeriods: (alert.activePeriod || []).map((ap) => ({
      start: ap.start ? new Date(ap.start * 1000) : null,
      end: ap.end ? new Date(ap.end * 1000) : null,
    })),
    affectedRoutes: (alert.informedEntity || [])
      .filter((ie) => ie.routeId)
      .map((ie) => ie.routeId),
    affectedStops: (alert.informedEntity || [])
      .filter((ie) => ie.stopId)
      .map((ie) => ie.stopId),
    cause: alert.cause,
    effect: alert.effect,
    severity: alert.severityLevel,
    headerText: alert.headerText?.translation?.[0]?.text || "Service Alert",
    descriptionText: alert.descriptionText?.translation?.[0]?.text || "",
    url: alert.url?.translation?.[0]?.text,
    realtimeFeedId,
    staticFeedId,
    createdAt: new Date(),
  };
}

/**
 * Validate vehicle position data - more lenient
 */
function validateVehiclePosition(data) {
  // Be more lenient - only require basic position data
  if (typeof data.latitude !== "number" || typeof data.longitude !== "number")
    return false;
  if (data.latitude < -90 || data.latitude > 90) return false;
  if (data.longitude < -180 || data.longitude > 180) return false;

  // Allow vehicles without vehicleId (will be generated)
  return true;
}

/**
 * Main parser function - convert protobuf buffer to structured data using gtfs-realtime-bindings
 */
async function parseRealtimeData(protobufBuffer, realtimeFeedId, staticFeedId) {
  try {
    // Decode the protobuf using gtfs-realtime-bindings
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(protobufBuffer)
    );

    const result = {
      header: {
        version: feed.header?.gtfsRealtimeVersion || "unknown",
        timestamp: feed.header?.timestamp
          ? new Date(feed.header.timestamp * 1000)
          : new Date(),
        incrementality: feed.header?.incrementality || 0,
      },
      vehicles: [],
      tripUpdates: [],
      alerts: [],
      stats: {
        totalEntities: 0,
        vehiclePositions: 0,
        tripUpdates: 0,
        alerts: 0,
      },
    };

    // Process entities
    for (const entity of feed.entity || []) {
      try {
        if (entity.isDeleted) continue;

        result.stats.totalEntities++;

        // Parse vehicle position
        if (entity.vehicle) {
          try {
            const vp = parseVehiclePosition(
              entity,
              realtimeFeedId,
              staticFeedId
            );
            if (vp && validateVehiclePosition(vp)) {
              result.vehicles.push(vp);
              result.stats.vehiclePositions++;
            }
          } catch (vpError) {
            console.warn(
              `Failed to parse vehicle position in ${realtimeFeedId}:`,
              vpError.message
            );
          }
        }

        // Parse trip update
        if (entity.tripUpdate) {
          try {
            const tu = parseTripUpdate(entity, realtimeFeedId, staticFeedId);
            if (tu) {
              result.tripUpdates.push(tu);
              result.stats.tripUpdates++;
            }
          } catch (tuError) {
            console.warn(
              `Failed to parse trip update in ${realtimeFeedId}:`,
              tuError.message
            );
          }
        }

        // Parse service alert
        if (entity.alert) {
          try {
            const alert = parseServiceAlert(
              entity,
              realtimeFeedId,
              staticFeedId
            );
            if (alert) {
              result.alerts.push(alert);
              result.stats.alerts++;
            }
          } catch (alertError) {
            console.warn(
              `Failed to parse service alert in ${realtimeFeedId}:`,
              alertError.message
            );
          }
        }
      } catch (entityError) {
        console.warn(
          `Failed to process entity in ${realtimeFeedId}:`,
          entityError.message
        );
      }
    }

    console.log(
      `Parsed ${realtimeFeedId}: ${result.stats.vehiclePositions} vehicles, ${result.stats.tripUpdates} updates, ${result.stats.alerts} alerts`
    );

    return result;
  } catch (error) {
    console.error(
      `Error parsing realtime data for ${realtimeFeedId}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Store parsed data in database and Redis
 */
async function storeParsedData(parsedData, realtimeFeedId, staticFeedId) {
  try {
    const stats = {
      vehiclesUpserted: 0,
      vehiclesStoredInRedis: 0,
      tripUpdatesInserted: 0,
      alertsInserted: 0,
      errors: 0,
    };

    // Store vehicle positions in both Redis and MongoDB
    for (const vehicle of parsedData.vehicles) {
      try {
        // Store in Redis first (fast access)
        const redisStored = await redisService.setVehiclePosition(
          vehicle.vehicleId,
          {
            vehicleId: vehicle.vehicleId,
            tripId: vehicle.tripId,
            routeId: vehicle.routeId,
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
            bearing: vehicle.bearing,
            speed: vehicle.speed,
            currentStopSequence: vehicle.currentStopSequence,
            stopId: vehicle.stopId,
            currentStatus: vehicle.currentStatus,
            congestionLevel: vehicle.congestionLevel,
            occupancyStatus: vehicle.occupancyStatus,
            occupancyPercentage: vehicle.occupancyPercentage,
            timestamp: vehicle.timestamp,
            realtimeFeedId,
            staticFeedId,
            feedId: realtimeFeedId, // For API consistency
          }
        );

        if (redisStored) {
          stats.vehiclesStoredInRedis++;
        }

        // Also store in MongoDB for persistence and historical data
        await VehiclePositionModel.updateOne(
          { vehicleId: vehicle.vehicleId, realtimeFeedId },
          { $set: vehicle },
          { upsert: true }
        );
        stats.vehiclesUpserted++;
      } catch (error) {
        console.error(
          `Failed to store vehicle ${vehicle.vehicleId}:`,
          error.message
        );
        stats.errors++;
      }
    }

    // Insert trip updates (MongoDB only, as these are less time-critical)
    if (parsedData.tripUpdates.length > 0) {
      try {
        const result = await TripUpdateModel.insertMany(
          parsedData.tripUpdates,
          {
            ordered: false, // Continue even if some fail
          }
        );
        stats.tripUpdatesInserted = result.length;
      } catch (error) {
        // Handle partial insert errors
        if (error.insertedDocs) {
          stats.tripUpdatesInserted = error.insertedDocs.length;
        }
        console.error(`Error inserting trip updates: ${error.message}`);
      }
    }

    // Insert service alerts (MongoDB only)
    if (parsedData.alerts.length > 0) {
      try {
        const result = await ServiceAlertModel.insertMany(parsedData.alerts, {
          ordered: false,
        });
        stats.alertsInserted = result.length;
      } catch (error) {
        if (error.insertedDocs) {
          stats.alertsInserted = error.insertedDocs.length;
        }
        console.error(`Error inserting alerts: ${error.message}`);
      }
    }

    console.log(
      `Storage stats: ${stats.vehiclesStoredInRedis} vehicles in Redis, ${stats.vehiclesUpserted} in MongoDB`
    );
    return stats;
  } catch (error) {
    console.error("Error storing parsed data:", error.message);
    throw error;
  }
}

module.exports = {
  initializeSchema,
  parseRealtimeData,
  parseVehiclePosition,
  parseTripUpdate,
  parseServiceAlert,
  validateVehiclePosition,
  storeParsedData,
};
