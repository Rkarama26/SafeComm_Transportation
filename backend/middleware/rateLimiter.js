const rateLimit = require("express-rate-limit");

/**
 * @param {number} maxRequests - Maximum number of requests allowed in the window
 * @param {number} windowMinutes - Duration of window (in minutes)
 * @param {string} [customMessage] - Optional custom message when limit exceeded
 */

const RateLimiter = (maxRequests, windowMinutes, customMessage) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000, // convert minutes to ms
    max: maxRequests, // number of requests allowed
    message: {
      success: false,
      message:
        customMessage ||
        `Too many requests — please try again after ${windowMinutes} minute(s).`,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      console.warn(
        `Rate limit hit: ${req.ip} → ${req.originalUrl} (${maxRequests} req / ${windowMinutes}min)`
      );
      res.status(options.statusCode).json(options.message);
    },
  });
};

module.exports = { RateLimiter };
