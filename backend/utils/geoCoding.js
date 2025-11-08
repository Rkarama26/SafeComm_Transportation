const axios = require("axios");

const API_KEY = process.env.GEOCODING_API_KEY;

async function getCoordinates(address) {
  if (!address) {
    throw new Error("Address is required");
  }

  const url = `https://geocode.maps.co/search?q=${encodeURIComponent(
    address
  )}&api_key=${API_KEY}`;

  try {
    const response = await axios.get(url);

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return { lat, lon };
    } else {
      throw new Error("No location found for the given address");
    }
  } catch (err) {
    throw new Error(`Geocoding failed: ${err.message}`);
  }
}

module.exports = { getCoordinates };
