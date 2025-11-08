const express = require("express");
const passport = require("passport");

const {
  authenticate,
  forgetPassword,
  googleAuthCallback,
  login,
  logout,
  refreshToken,
  resetPassword,
  signup,
} = require("../controllers/authController");

const {
  loginValidator,
  signupValidator,
  validateRequest,
} = require("../middleware/authValidator");

const authRouter = express.Router(); 

// SIGNUP
authRouter.post("/signup", signupValidator, validateRequest, signup);

// LOGIN
authRouter.post("/login", loginValidator, validateRequest, login);

// REFRESH TOKEN
authRouter.post("/refresh", refreshToken);

// LOGOUT
authRouter.post("/logout", logout);

// FORGET PASSWORD
authRouter.post("/forget-password", forgetPassword);

// RESET PASSWORD
authRouter.post("/reset-password", resetPassword);

// GOOGLE OAUTH via Passport
authRouter.get("/google", authenticate);

// GOOGLE CALLBACK
authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  googleAuthCallback
);

module.exports = authRouter;
