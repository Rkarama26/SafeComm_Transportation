const mongoose = require("mongoose");

const FeedInfoSchema = new mongoose.Schema({
  feedId: { type: String, required: true, unique: true },
  feed_publisher_name: String,
  feed_publisher_url: String,
  feed_lang: String,
  default_lang: String,
  feed_start_date: Date,
  feed_end_date: Date,
  feed_version: String,
  feed_contact_email: String,
  feed_contact_url: String,
  sourceUrl: String,
  downloadedAt: Date,
});

const FeedInfoModel = mongoose.model("FeedInfo", FeedInfoSchema);
module.exports = FeedInfoModel;
