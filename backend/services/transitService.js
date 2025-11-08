const axios = require("axios");
const RouteModel = require("../models/route.model");
const { getCoordinates } = require("../utils/geoCoding");

const MAPPLS_REST_KEY = process.env.MAPPLES_API_KEY;
const BASE_URL = process.env.MAPPLES_BASE_URL;
const GEO_URL = "https://atlas.mappls.com/api/places/geocode";

// Get all routes from DB
const getAllRoutes = async (req, res) => {
  try {
    const routes = await RouteModel.find();
    if (routes.length > 0) {
      console.log(` Data fetched — ${routes.length} routes found.`);

      return res.status(200).json({
        source: "database",
        count: routes.length,
        data: routes,
      });
    } else {
      console.log(" No routes found in DB.");
      return res.status(404).json({ message: "No routes found" });
    }
  } catch (error) {
    console.error(" Error fetching routes from DB:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get route either from DB or Mappls API
 */
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
  getRouteFromMappls,
};
