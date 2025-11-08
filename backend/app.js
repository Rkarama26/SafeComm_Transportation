const express = require("express");
const morgan = require("morgan");

const app = express();

//  middlewares
// const cors = require("cors");
const helmet = require("helmet");
const authRouter = require("./routes/authRoutes");
const transitRouter = require("./routes/transitRoute");
const gtfsRouter = require("./routes/gtfsRoutes");
const tokenRouter = require("./routes/tokenRoutes");
app.use(helmet()); // Security headers
// app.use(cors());                  // Enable CORS
// app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); // HTTP request logger
app.use(express.json()); // Parse JSON request body

// API routes
app.use("/api/auth", authRouter);
app.use("/api/transit", transitRouter);
app.use("/api/gtfs", gtfsRouter);
app.use("/api", tokenRouter);

// Cron jobs
require("./cronJobs/tokenCron");

// Test route
app.get("/test", (req, res) => {
  res.status(200).json({ message: "Transit Safety Backend API running 🚦" });
});

module.exports = app;
