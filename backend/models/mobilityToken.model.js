
const mongoose = require("mongoose");

const MobilityAccessTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
}); 

const MobilityTokenModel = mongoose.model("MobilityAccessToken", MobilityAccessTokenSchema);
module.exports = MobilityTokenModel;