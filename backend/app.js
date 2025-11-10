const express = require("express");
const morgan = require("morgan");

const app = express();

//  middlewares
const cors = require("cors");
const helmet = require("helmet");
const authRouter = require("./routes/authRoutes");
const transitRouter = require("./routes/transitRoute");
const gtfsRouter = require("./routes/gtfsRoutes");
const gtfsRealtimeRouter = require("./routes/gtfsRealtimeRoutes");
const gtfsRealtimeQueryRouter = require("./routes/gtfsRealtimeQueryRoutes");
const tokenRouter = require("./routes/tokenRoutes");
const feedRouter = require("./routes/feedRoutes");

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:4000",
      "https://safecomm-transportation-9031.onrender.com",
      "https://safecomm-transportation.onrender.com",
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
); // Security headers
app.use(cors(corsOptions)); // Enable CORS with options
// app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); // HTTP request logger
app.use(express.json()); // Parse JSON request body

// Swagger documentation (before static files so / redirects to /api-docs)
const setupSwagger = require("./config/swagger");
setupSwagger(app);

// Serve static files from public directory
app.use(express.static("public"));

// API routes
app.use("/api/auth", authRouter);
app.use("/api/transit", transitRouter);
app.use("/api/gtfs", gtfsRouter);
app.use("/api/gtfs-rt", gtfsRealtimeRouter);
app.use("/api/gtfs-rt", gtfsRealtimeQueryRouter); // Real-time query endpoints
app.use("/api/feed", feedRouter); // Feed and rating endpoints
app.use("/api", tokenRouter);

// Cron jobs
require("./cronJobs/tokenCron");

// Initialize and start realtime scheduler
const realtimeScheduler = require("./cronJobs/realtimeUpdateCron");
app.realtimeScheduler = realtimeScheduler;

// Test route
app.get("/test", (req, res) => {
  res.status(200).json({ message: "Transit Safety Backend API running" });
});

module.exports = app;
