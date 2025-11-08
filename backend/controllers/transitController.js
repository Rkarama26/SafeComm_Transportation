const transitService = require("../services/transitService");

const getAllRoutes = async (req, res) => {
  try {
    const routes = await transitService.getAllRoutes();
    res.status(200).json({
      success: true,
      count: routes.length,
      data: routes,
    });
  } catch (error) {
    console.error("Error fetching routes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch routes.",
    });
  }
};

// GET or create route via Mappls
const getRouteFromMappls = async (req, res) => {
  try {
    const { source, destination, startLat, startLon, endLat, endLon } =
      req.query;

    //  Validate source & destination
    if (!source || !destination) {
      return res.status(400).json({
        success: false,
        message: "Please provide both source and destination.",
      });
    }

    //  Validate optional coordinates (if partially provided)
    const coords = [startLat, startLon, endLat, endLon];
    const hasAnyCoord = coords.some((v) => v !== undefined && v !== "");
    const hasAllCoords = coords.every((v) => v !== undefined && v !== "");

    if (hasAnyCoord && !hasAllCoords) {
      return res.status(400).json({
        success: false,
        message:
          "If you provide one coordinate (startLat/startLon/endLat/endLon), you must provide all four.",
      });
    }

    //  Fetch route (DB or Mappls)
    const route = await transitService.getRouteFromMappls(
      source,
      destination,
      startLat,
      startLon,
      endLat,
      endLon
    );

    res.status(200).json({
      success: true,
      source: route.sourceType, // 'database' or 'Mappls API'
      data: route.data,
    });
  } catch (error) {
    console.error("Mappls route error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get route from Mappls.",
    });
  }
};

module.exports = {
  getAllRoutes,
  getRouteFromMappls,
};
