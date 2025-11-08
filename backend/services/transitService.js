const axios = require("axios");
const RouteModel = require("../models/route.model");
const { getCoordinates } = require("../utils/geoCoding");
const RoutesModel = require("../static_gtfs_models/Routes");
const TripModel = require("../static_gtfs_models/Trip");
const ShapeModel = require("../static_gtfs_models/Shape.js");
const StopModel = require("../static_gtfs_models/Stop.js");
const StopTimeModel = require("../static_gtfs_models/StopTime.js");

const MAPPLS_REST_KEY = process.env.MAPPLES_API_KEY;
const BASE_URL = process.env.MAPPLES_BASE_URL;
const GEO_URL = "https://atlas.mappls.com/api/places/geocode";

//GET /api/transit/routes?feedId=mdb-1210&page=1&limit=10
//Get all routes
const getAllRoutes = async (feedId, page = 1, limit = 10) => {
  try {
    const filter = feedId ? { feedId } : {};
    const skip = (page - 1) * limit;
    const routes = await RoutesModel.find(filter)
      .select("route_id route_short_name route_long_name route_type")
      .skip(skip)
      .limit(limit);
    const total = await RoutesModel.countDocuments(filter);
    return {
      success: true,
      count: routes.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: routes,
    };
  } catch (err) {
    throw new Error(err.message);
  }
};

//GET /api/transit/routes/:route_id
/*Get route details + shape
Goal: Get detailed route info, with geometry (shape).
*/
const getRouteDetails = async (route_id) => {
  try {
    const route = await RoutesModel.findOne({ route_id });
    if (!route) throw new Error("Route not found");

    // get example trip & shape
    const trip = await TripModel.findOne({ route_id })
      .select("shape_id")
      .lean();
    const shape = trip
      ? await ShapeModel.findOne({ shape_id: trip.shape_id }).lean()
      : null;

    return { success: true, data: { route, shape } };
  } catch (err) {
    throw new Error(err.message);
  }
};

//GET /api/transit/stops/nearby?lat=34.05&lon=-118.25&radius=1000
/*
Get stops nearby a location
Goal: Find all stops within a radius from user location.
*/
const getNearbyStops = async (lat, lon, radius = 500) => {
  try {
    // Validate inputs
    if (!lat || !lon) {
      throw new Error("Latitude and longitude are required");
    }
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const radiusNum = parseFloat(radius);

    if (isNaN(latNum) || isNaN(lonNum)) {
      throw new Error("Invalid latitude or longitude values");
    }

    if (latNum < -90 || latNum > 90) {
      throw new Error("Latitude must be between -90 and 90");
    }

    if (lonNum < -180 || lonNum > 180) {
      throw new Error("Longitude must be between -180 and 180");
    }

    if (isNaN(radiusNum) || radiusNum <= 0 || radiusNum > 50000) {
      throw new Error(
        "Radius must be a positive number and less than 50,000 meters"
      );
    }

    const nearby = await StopModel.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lonNum, latNum],
          },
          $maxDistance: radiusNum,
        },
      },
    }).limit(50);

    return { success: true, count: nearby.length, data: nearby };
  } catch (err) {
    if (err.message.includes("Geospatial")) {
      throw new Error(
        "Geospatial search is not available. Please check database indexes."
      );
    }
    throw new Error(err.message);
  }
};

//GET /api/transit/stops/:stop_id/schedule?date=2024-10-01
/*
Get stop schedule
Goal: Get upcoming arrivals/departures for a specific stop on a given date.
*/
const getStopSchedule = async (stop_id, date) => {
  try {
    const stopTimes = await StopTimeModel.find({ stop_id })
      .sort({ arrival_time: 1 })
      .limit(50)
      .lean();

    const tripIds = [...new Set(stopTimes.map((t) => t.trip_id))];
    const trips = await TripModel.find({ trip_id: { $in: tripIds } }).select(
      "route_id trip_headsign"
    );

    return { success: true, stop_id, date, data: { stopTimes, trips } };
  } catch (err) {
    throw new Error(err.message);
  }
};

/*
Get trips for a route
Goal: All trips (and optionally stop sequences) for a specific route.
GET /api/transit/trips?route_id=123
*/
const getTripsForRoute = async (route_id) => {
  try {
    const trips = await TripModel.find({ route_id }).select(
      "trip_id trip_headsign direction_id service_id shape_id"
    );
    return { success: true, count: trips.length, data: trips };
  } catch (err) {
    throw new Error(err.message);
  }
};

// Get route either from DB or Mappls API
const getRouteFromMappls = async (
  source,
  destination,
  startLat,
  startLon,
  endLat,
  endLon
) => {
  const src = source.trim();
  const dest = destination.trim();

  try {
    //  Check if route exists in DB
    const existingRoute = await RouteModel.findOne({
      source: src,
      destination: dest,
    });
    if (existingRoute) {
      console.log(` Route found in DB for ${src} → ${dest}`);
      return { sourceType: "database", data: existingRoute };
    }

    console.log(
      ` Route not found in DB — fetching from Mappls API (${src} → ${dest})`
    );

    //  If coordinates not provided → Geocode
    if (!startLat || !startLon) {
      const srcCoords = await getCoordinates(src);
      startLat = srcCoords.lat;
      startLon = srcCoords.lon;
    }
    if (!endLat || !endLon) {
      const destCoords = await getCoordinates(dest);
      endLat = destCoords.lat;
      endLon = destCoords.lon;
    }

    console.log(
      ` Using coords: ${src} (${startLat}, ${startLon}) → ${dest} (${endLat}, ${endLon})`
    );

    //  Call Mappls Route API
    const apiUrl = `${BASE_URL}/${MAPPLS_REST_KEY}/route_adv/driving/${startLon},${startLat};${endLon},${endLat}`;
    const response = await axios.get(apiUrl);
    const routeData = response.data?.routes?.[0];
    const waypoints = response.data?.waypoints;

    if (!routeData) throw new Error("No route data received from Mappls API");

    //  Extract route details
    const distanceKm = (routeData.distance || 0) / 1000; // in kilometers
    const durationMin = (routeData.duration || 0) / 60; // in minutes

    //  Save new route to DB
    const newRoute = new RouteModel({
      routeId: `R-${Date.now()}`,
      name: `${src} → ${dest}`,
      source: src,
      destination: dest,
      startLat: waypoints?.[0]?.location?.[1] || startLat,
      startLon: waypoints?.[0]?.location?.[0] || startLon,
      endLat: waypoints?.[1]?.location?.[1] || endLat,
      endLon: waypoints?.[1]?.location?.[0] || endLon,
      distance: Number(distanceKm.toFixed(2)),
      duration: Number(durationMin.toFixed(2)),
      geometry: routeData.geometry || "",
      stops: [src, dest],
    });

    await newRoute.save();

    console.log(` Route saved in DB for ${src} → ${dest}`);

    return { sourceType: "Mappls API", data: newRoute };
  } catch (error) {
    console.error(" Error in getRouteFromMappls:", error.message);
    throw error;
  }
};

module.exports = {
  getAllRoutes,
  getRouteDetails,
  getNearbyStops,
  getStopSchedule,
  getTripsForRoute,
  getRouteFromMappls,
};
