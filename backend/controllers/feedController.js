const { importGTFS } = require("../services/gtfsImporterService");

const importFeed = async (req, res) => {
  try {
    const { preferredFeedId, ...locationParams } = req.body;

    // Validate that at least some location parameters are provided
    const hasLocationParams = Object.keys(locationParams).some(
      (key) =>
        locationParams[key] !== null &&
        locationParams[key] !== undefined &&
        locationParams[key] !== ""
    );

    if (!hasLocationParams) {
      return res.status(400).json({
        success: false,
        message:
          "At least one location parameter is required (e.g., country_code, subdivision_name, municipality, dataset_latitudes, dataset_longitudes)",
      });
    }

    console.log(
      "Starting GTFS import with location parameters:",
      locationParams
    );

    const result = await importGTFS(locationParams, preferredFeedId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Error in importFeed controller:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { importFeed };
