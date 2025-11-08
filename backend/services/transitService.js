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

//GET /api/transit/routes?feedId=mdb-1210
//Get all routes
const getAllRoutes = async (req, res) => {
  try {
    const { feedId } = req.query;
    const filter = feedId ? { feedId } : {};
    const routes = await RoutesModel.find(filter).select(
      "route_id route_short_name route_long_name route_type"
    );
    res.json({ success: true, count: routes.length, data: routes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//GET /api/transit/routes/:route_id
/*Get route details + shape
Goal: Get detailed route info, with geometry (shape).
*/
const getRouteDetails = async (req, res) => {
  try {
    const { route_id } = req.params;
    const route = await RoutesModel.findOne({ route_id });
    if (!route) return res.status(404).json({ message: "Route not found" });

    // get example trip & shape
    const trip = await TripModel.findOne({ route_id })
      .select("shape_id")
      .lean();
    const shape = trip
      ? await ShapeModel.findOne({ shape_id: trip.shape_id }).lean()
      : null;

    res.json({ success: true, data: { route, shape } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//GET /api/transit/stops/nearby?lat=34.05&lon=-118.25&radius=1000
/*
Get stops nearby a location
Goal: Find all stops within a radius from user location.
*/
const getNearbyStops = async (req, res) => {
  try {
    const { lat, lon, radius = 500 } = req.query;
    const nearby = await StopModel.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lon), parseFloat(lat)],
          },
          $maxDistance: parseFloat(radius),
        },
      },
    }).limit(50);

    res.json({ success: true, count: nearby.length, data: nearby });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//GET /api/transit/stops/:stop_id/schedule?date=2024-10-01
/*
Get stop schedule
Goal: Get upcoming arrivals/departures for a specific stop on a given date.
*/
const getStopSchedule = async (req, res) => {
  try {
    const { stop_id } = req.params;
    const { date } = req.query;

    const stopTimes = await StopTimeModel.find({ stop_id })
      .sort({ arrival_time: 1 })
      .limit(50)
      .lean();

    const tripIds = [...new Set(stopTimes.map((t) => t.trip_id))];
    const trips = await TripModel.find({ trip_id: { $in: tripIds } }).select(
      "route_id trip_headsign"
    );

    res.json({ success: true, stop_id, date, data: { stopTimes, trips } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/*
Get trips for a route
Goal: All trips (and optionally stop sequences) for a specific route.
GET /api/transit/trips?route_id=123
*/
const getTripsForRoute = async (req, res) => {
  try {
    const { route_id } = req.query;
    const trips = await TripModel.find({ route_id }).select(
      "trip_id trip_headsign direction_id service_id shape_id"
    );
    res.json({ success: true, count: trips.length, data: trips });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
