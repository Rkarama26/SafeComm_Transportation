const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    routeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    startLat: {
      type: Number,
      required: true,
    },
    startLon: {
      type: Number,
      required: true,
    },
    endLat: {
      type: Number,
      required: true,
    },
    endLon: {
      type: Number,
      required: true,
    },
    distance: {
      type: Number, // km
      required: true,
    },
    duration: {
      type: Number, // minutes
      required: true,
    },
    geometry: {
      type: String, // encoded polyline
      required: true,
    },
    stops: [
      {
        type: String,
        trim: true,
      },
    ],
    averageSafetyRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Virtuals: link vehicles and ratings
routeSchema.virtual("vehicles", {
  ref: "Vehicle",
  localField: "_id",
  foreignField: "route",
});

routeSchema.virtual("ratings", {
  ref: "RouteRating",
  localField: "_id",
  foreignField: "route",
});

//  virtuals when converting to JSON
routeSchema.set("toJSON", { virtuals: true });
routeSchema.set("toObject", { virtuals: true });

const RouteModel = mongoose.model("Route", routeSchema);
module.exports = RouteModel;
