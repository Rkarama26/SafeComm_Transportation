const express = require("express");
const { importFeed } = require("../controllers/feedController");

const feedRouter = express.Router();

feedRouter.post("/import", importFeed);

module.exports = feedRouter;