const { importGTFS } = require("../services/gtfsImporter");

const importFeed = async (req, res) => {
  try {
    const { feedId, feedUrl } = req.body;

    if (!feedId || !feedUrl)
      return res.status(400).json({ success: false, message: "feedId and feedUrl are required" });

    await importGTFS(feedId, feedUrl);
    res.status(200).json({ success: true, message: "GTFS feed imported successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { importFeed };
