const axios = require("axios");
const fs = require("fs");
const path = require("path");
const MobilityTokenModel = require("../models/mobilityToken.model");

const REFRESH_TOKEN = process.env.MOBILITY_REFRESH_TOKEN;
const MOBILITY_BASE_URL =
  process.env.MOBILITY_BASE_URL;

let accessToken = null;

let cachedToken = null;

async function generateAccessToken() {
  try {
    const response = await axios.post(
      `${MOBILITY_BASE_URL}/tokens`,
      { refresh_token: REFRESH_TOKEN },
      { headers: { "Content-Type": "application/json" } }
    );

    const token = response.data.access_token;

    // Update or insert the token record
    await MobilityTokenModel.findOneAndUpdate(
      {},
      { token, updatedAt: new Date() },
      { upsert: true }
    );

    cachedToken = token;
    console.log(
      "✅ New Mobility access token generated at:",
      new Date().toLocaleString()
    );
    return token;
  } catch (err) {
    console.error(" Failed to generate Mobility token:", err.message);
  }
}

async function getAccessToken() {
  if (cachedToken) return cachedToken;

  const record = await MobilityTokenModel.findOne({});
  if (record) {
    cachedToken = record.token;
    return cachedToken;
  }

  console.warn("⚠️ No token found in DB, generating a new one...");
  return await generateAccessToken();
}

module.exports = { generateAccessToken, getAccessToken };
