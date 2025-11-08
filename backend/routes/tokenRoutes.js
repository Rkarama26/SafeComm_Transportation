const express = require("express");
const {
  getToken,
  getTokenInfo,
} = require("../controllers/tokenController");
const authMiddleware = require("../middleware/auth_midleware");

const tokenRouter = express.Router();

tokenRouter.post("/access_token", authMiddleware(["user", "admin"]), getToken);

tokenRouter.get("/info", getTokenInfo);

module.exports = tokenRouter;
