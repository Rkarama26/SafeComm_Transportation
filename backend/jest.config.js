export default {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  transform: {}, // disables Babel transform since you're using native ESM
  testTimeout: 20000, // increases global test timeout
};
