const mongoose = require("mongoose");

const CalendarDateSchema = new mongoose.Schema({
  feedId: String,
  service_id: { type: String, index: true },
  date: Date,
  exception_type: Number, // 1=Added, 2=Removed
});

const CalendarDateModel = mongoose.model("CalendarDate", CalendarDateSchema);   

module.exports = CalendarDateModel;