const jwt = require("jsonwebtoken");
const BlackListTokenModel = require("../models/blackListToken.model");

const authMiddleware = (roles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.headers?.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      // check if token is blacklisted
      const blacklisted = await BlackListTokenModel.exists({ token });
      if (blacklisted) {
        return res
          .status(403)
          .json({ error: "Token is blacklisted. Access denied." });
      }

      // verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      if (!decoded) {
        return res.status(403).json({ error: "Invalid token" });
      }

      // role-based access control
      if (
        roles.length > 0 &&
        (!decoded.role || !roles.includes(decoded.role))
      ) {
        return res
          .status(403)
          .json({ error: "Access denied: insufficient permissions" });
      }

      req.user = {
        id: decoded.userId,
        role: decoded.role,
      };

      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ error: "Token expired. Please log in again." });
      } else if (error.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ error: "Invalid token. Please log in again." });
      } else {
        console.error("Auth middleware error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  };
};

module.exports = authMiddleware;
