const { body, validationResult, param } = require("express-validator");

// Middleware to handle validation result
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = errors.array()[0].msg;
    return res.status(400).json({ message: error });
  }
  next();
};

// Signup validation rules
const signupValidator = [
  body("firstname")
    .trim()
    .notEmpty()
    .withMessage("First name is missing")
    .isLength({ min: 2 })
    .withMessage("First name must be at least 2 characters"),

  body("lastname")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Last name must be at least 2 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("role")
    .optional()
    .isIn(["user", "admin"])
    .withMessage("Role must be either 'user' or 'admin'"),
];

// Login validation rules
const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),

  body("password").trim().notEmpty().withMessage("Password is required"),
];

// Route Rating validation rules
const validateRatingInput = [
  body("routeId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Route ID is required"),

  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),

  body("feedback")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Feedback must not exceed 500 characters"),
];

// Route ID validation
const validateRouteId = [
  param("routeId").trim().notEmpty().withMessage("Route ID is required"),
];

module.exports = {
  validateRequest,
  signupValidator,
  loginValidator,
  validateRatingInput,
  validateRouteId,
};
