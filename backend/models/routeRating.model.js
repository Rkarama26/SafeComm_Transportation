const mongoose = require("mongoose");

const routeRatingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route", // 🔗 Relation to Route
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    feedback: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const RouteRatingModel = mongoose.model("RouteRating", routeRatingSchema);
module.exports = RouteRatingModel;
