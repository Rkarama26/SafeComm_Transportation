const mongoose = require("mongoose");

const blackListTokenSchema = new mongoose.Schema({
  token: String,
});

const BlackListTokenModel = new mongoose.model(
  "BlacklistToken",
  blackListTokenSchema
);
module.exports = BlackListTokenModel;
