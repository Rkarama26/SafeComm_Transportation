const cron = require("node-cron");
const { generateAccessToken } = require("../services/tokenService");

// Run immediately when server starts
generateAccessToken();

// Schedule refresh every 55 minutes
cron.schedule("*/55 * * * *", async () => {
  console.log(" Running Mobility access token refresh cron...");
  await generateAccessToken();
});

console.log(" Mobility token refresh cron initialized (every 55 minutes).");
