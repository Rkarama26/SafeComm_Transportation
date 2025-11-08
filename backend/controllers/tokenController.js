const MobilityTokenModel = require("../models/mobilityToken.model");
const {
  getAccessToken,
  generateAccessToken,
} = require("../services/tokenService");

const getToken = async (req, res) => {
  try {
    const token = await getAccessToken();

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "No Mobility access token found",
      });
    }

    res.status(200).json({
      success: true,
      token,
    });
  } catch (err) {
    console.error(" Error getting Mobility token:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Mobility token",
    });
  }
};

const getTokenInfo = async (req, res) => {
  try {
    const record = await MobilityTokenModel.findOne({});
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "No token found in database",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        token: record.token,
        updatedAt: record.updatedAt,
      },
    });
  } catch (err) {
    console.error(" Error fetching token info:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to get token info",
    });
  }
};

module.exports = {
  getToken,
  getTokenInfo,
};
