const { importGTFS } = require("../services/gtfsImporterService");
const RouteRating = require("../models/routeRating.model.js");
const SafetyReport = require("../models/safetyReport.model.js");
const Route = require("../gtfs_models/Routes.js");

/**
 * GTFS Import Controller
 */
const importFeed = async (req, res) => {
  try {
    const { preferredFeedId, ...locationParams } = req.body;

    // Validate that at least some location parameters are provided
    const hasLocationParams = Object.keys(locationParams).some(
      (key) =>
        locationParams[key] !== null &&
        locationParams[key] !== undefined &&
        locationParams[key] !== ""
    );

    if (!hasLocationParams) {
      return res.status(400).json({
        success: false,
        message:
          "At least one location parameter is required (e.g., country_code, subdivision_name, municipality, dataset_latitudes, dataset_longitudes)",
      });
    }

    console.log(
      "Starting GTFS import with location parameters:",
      locationParams
    );

    const result = await importGTFS(locationParams, preferredFeedId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Error in importFeed controller:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ROUTE SAFETY RATING ENDPOINTS
 */

/**
 * Create a new route safety rating
 * POST /api/feed/ratings
 */
const createRouteRating = async (req, res) => {
  try {
    const { routeId, rating, feedback } = req.body;
    const userId = req.user._id; // From auth middleware

    // Validate input
    if (!routeId || !rating) {
      return res.status(400).json({
        success: false,
        message: "routeId and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Check if route exists
    const routeExists = await Route.findById(routeId);
    if (!routeExists) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    // Check if user already rated this route
    const existingRating = await RouteRating.findOne({
      user: userId,
      route: routeId,
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.feedback = feedback || existingRating.feedback;
      await existingRating.save();

      return res.status(200).json({
        success: true,
        message: "Rating updated successfully",
        data: existingRating,
      });
    }

    // Create new rating
    const newRating = new RouteRating({
      user: userId,
      route: routeId,
      rating,
      feedback: feedback || "",
    });

    await newRating.save();

    res.status(201).json({
      success: true,
      message: "Rating created successfully",
      data: newRating,
    });
  } catch (error) {
    console.error("Error creating route rating:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all ratings for a specific route
 * GET /api/feed/ratings/:routeId
 */
const getRouteRatings = async (req, res) => {
  try {
    const { routeId } = req.params;

    // Check if route exists
    const routeExists = await Route.findById(routeId);
    if (!routeExists) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    // Get all ratings for this route with user info
    const ratings = await RouteRating.find({ route: routeId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    // Calculate average rating
    const averageRating =
      ratings.length > 0
        ? (
            ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          ).toFixed(2)
        : 0;

    res.status(200).json({
      success: true,
      count: ratings.length,
      averageRating: parseFloat(averageRating),
      data: ratings,
    });
  } catch (error) {
    console.error("Error fetching route ratings:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all ratings submitted by the current user
 * GET /api/feed/ratings/user/my-ratings
 */
const getUserRatings = async (req, res) => {
  try {
    const userId = req.user._id;

    const ratings = await RouteRating.find({ user: userId })
      .populate("route", "route_id route_short_name route_long_name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: ratings.length,
      data: ratings,
    });
  } catch (error) {
    console.error("Error fetching user ratings:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update a specific rating
 * PUT /api/feed/ratings/:ratingId
 */
const updateRouteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user._id;

    // Validate rating value
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Find rating and verify ownership
    const existingRating = await RouteRating.findById(ratingId);

    if (!existingRating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found",
      });
    }

    if (existingRating.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own ratings",
      });
    }

    // Update fields
    if (rating) existingRating.rating = rating;
    if (feedback) existingRating.feedback = feedback;

    await existingRating.save();

    res.status(200).json({
      success: true,
      message: "Rating updated successfully",
      data: existingRating,
    });
  } catch (error) {
    console.error("Error updating route rating:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete a specific rating
 * DELETE /api/feed/ratings/:ratingId
 */
const deleteRouteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user._id;

    // Find rating and verify ownership
    const rating = await RouteRating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found",
      });
    }

    if (rating.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own ratings",
      });
    }

    await RouteRating.findByIdAndDelete(ratingId);

    res.status(200).json({
      success: true,
      message: "Rating deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting route rating:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get route safety statistics
 * GET /api/feed/ratings/stats/by-route/:routeId
 */
const getRouteSafetyStats = async (req, res) => {
  try {
    const { routeId } = req.params;

    // Check if route exists
    const routeExists = await Route.findById(routeId);
    if (!routeExists) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    // Get ratings
    const ratings = await RouteRating.find({ route: routeId });

    // Get safety reports
    const reports = await SafetyReport.find({ route: routeId });

    // Calculate statistics
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    ratings.forEach((r) => {
      ratingDistribution[r.rating]++;
    });

    const averageRating =
      ratings.length > 0
        ? (
            ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          ).toFixed(2)
        : 0;

    const reportStats = {
      total: reports.length,
      open: reports.filter((r) => r.status === "open").length,
      investigating: reports.filter((r) => r.status === "investigating").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
    };

    res.status(200).json({
      success: true,
      data: {
        route: routeExists,
        ratings: {
          count: ratings.length,
          average: parseFloat(averageRating),
          distribution: ratingDistribution,
        },
        reports: reportStats,
        safetyScore: calculateSafetyScore(averageRating, reportStats),
      },
    });
  } catch (error) {
    console.error("Error fetching route safety stats:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Helper function to calculate safety score
 */
const calculateSafetyScore = (averageRating, reportStats) => {
  // Score based on rating (70% weight) and reports (30% weight)
  const ratingScore = (averageRating / 5) * 70;
  const reportPenalty = Math.min(reportStats.open * 5, 30);
  const finalScore = Math.max(ratingScore - reportPenalty, 0);

  return parseFloat(finalScore.toFixed(2));
};

module.exports = {
  importFeed,
  createRouteRating,
  getRouteRatings,
  getUserRatings,
  updateRouteRating,
  deleteRouteRating,
  getRouteSafetyStats,
};
