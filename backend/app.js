const express = require("express");
const morgan = require("morgan");

const app = express();

//  middlewares
// const cors = require("cors");
const helmet = require("helmet");
const authRouter = require("./routes/authRoutes");
const transitRouter = require("./routes/transitRoute");
const gtfsRouter = require("./routes/gtfsRoutes");
const gtfsRealtimeRouter = require("./routes/gtfsRealtimeRoutes");
const gtfsRealtimeQueryRouter = require("./routes/gtfsRealtimeQueryRoutes");
const tokenRouter = require("./routes/tokenRoutes");
const feedRouter = require("./routes/feedRoutes");
app.use(helmet()); // Security headers
// app.use(cors());                  // Enable CORS
// app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); // HTTP request logger
app.use(express.json()); // Parse JSON request body

// Serve static files from public directory
app.use(express.static("public"));

// Swagger documentation
const setupSwagger = require("./config/swagger");
setupSwagger(app);

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
