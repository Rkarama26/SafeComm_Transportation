const express = require("express");
const morgan = require("morgan");
const authRouter = require("./routes/authRoutes");

const app = express();

//  middlewares
// const cors = require("cors");
 const helmet = require("helmet");
 app.use(helmet());                // Security headers
// app.use(cors());                  // Enable CORS
// app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));             // HTTP request logger
app.use(express.json());            // Parse JSON request body

// API routes
app.use("/api/auth", authRouter);

// Test route
app.get("/test", (req, res) => {
  res.status(200).json({ message: "Transit Safety Backend API running 🚦" });
});

module.exports = app;
