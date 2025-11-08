const mongoose = require("mongoose");

const AgencySchema = new mongoose.Schema({
  feedId: String,
  agency_id: { type: String, index: true },
  agency_name: String,
  agency_url: String,
  agency_timezone: String,
  agency_lang: String,
  agency_phone: String,
  agency_fare_url: String,
  agency_email: String,
});

const AgencyModel = mongoose.model("Agency", AgencySchema);
module.exports = AgencyModel;