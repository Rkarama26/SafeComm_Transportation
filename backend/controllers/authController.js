const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const BlackListTokenModel = require("../models/blackListToken.model");
const { publishEmailJob } = require("../queues/emailPublisher");
const UserModel = require("../models/user");

dotenv.config();

const saltRounds = 10;

var refreshTokens = [];

const signup = async (req, res) => {
  try {
    const { firstname, lastname, email, password, role } = req.body;
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    bcrypt.hash(password, saltRounds, async function (err, hash) {
      if (err) return res.status(500).json({ message: "Something went wrong" });

      await UserModel.create({
        firstname, 
        lastname,
        email,
        password: hash,
        role,
      });
      res.status(201).json({ message: "Signup Success" });
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found, please signup" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(403).json({ message: "Wrong Password" });

    // Access Token (15–20 min)
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "24h" } // 24 hours
    );

    // Refresh Token (7 days)
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // store refresh token
    refreshTokens.push(refreshToken);

    res.status(200).json({
      message: "Login Success",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken)
    return res.status(401).json({ message: "Refresh token required" });

  if (!refreshTokens.includes(refreshToken))
    return res.status(403).json({ message: "Invalid refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    //   get current role
    const user = await UserModel.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // new access token including role
    const newAccessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "24h" } // 24hours
    );

    res.json({
      message: "New access token issued",
      accessToken: newAccessToken,
    });
  } catch (err) {
    return res
      .status(403)
      .json({ message: "Invalid or expired refresh token" });
  }
};

const logout = (req, res) => {
  const { refreshToken } = req.body;
  refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
  res.json({ message: "Logged out successfully" });
};

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    let user = await UserModel.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
    } else {
      // user found
      // need to send a reset pasword link with token to the mail
      // user/reset-passsword?token=giufkjnsvkmdfsfjsdfgj

      const resetToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET_KEY,
        { expiresIn: 2 * 60 } // 2 minutes
      );
      let resetPasswordLink = `http://localhost:3000/api/auth/reset-password?token=${resetToken}`;
      await publishEmailJob({
        to: user.email,
        subject: "Password Reset Link",
        html: `
        <p>Dear ${user.firstname},</p>
        <p>You requested to reset your password. Click the link below to set a new password (valid for 2 minutes):</p>
        <a href="${resetPasswordLink}" target="_blank">${resetPasswordLink}</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
      });
      res.json({
        message: "Passsword reset link sent to registered email",
        link: resetPasswordLink,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Something went wrong, please try again" });
  }
};

const resetPassword = async (req, res) => {
  const { token } = req.query;
  const { newPassword } = req.body;
  try {
    let decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (decoded) {
      // token verified
      // recieve new password
      let user = await UserModel.findById(decoded.userId);
      // user.password = newPassword // raw password, it should be hashed
      // await user.save();

      bcrypt.hash(newPassword, saltRounds, async function (err, hash) {
        if (err)
          return res.status(500).json({ message: "Something went wrong" });

        user.password = hash; // hashed password
        await user.save();
        // after pass-reset, blacklist the token
        await BlackListTokenModel.create({ token });
        console.log(user);
        return res.status(201).json({ message: "Password reset successfully" });
      });
    }
  } catch (error) {
    if (error.message == "jwt expired") {
      res.status(403).json({
        message:
          "Password reset link expired, plese click forget password again",
      });
    } else {
      res
        .status(500)
        .json({ message: "Something went wrong, please try again later" });
    }
  }
};

//----- Google OAuth  -----
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await UserModel.findOne({ googleId: profile.id });

        if (!user) {
          user = await UserModel.create({
            googleId: profile.id,
            firstname: profile.name?.givenName,
            lastname: profile.name?.familyName,
            email: profile.emails?.[0]?.value,
          });
          user.isNew = true; // just a flag for response
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

const authenticate = passport.authenticate("google", {
  scope: ["profile", "email"],
});

const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(400)
        .json({ message: "No user found after Google login" });
    }

    // Create tokens
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    refreshTokens.push(refreshToken);

    // Redirect to frontend with tokens
    const redirectUrl = `http://localhost:5173/oauth-success?accessToken=${accessToken}&refreshToken=${refreshToken}`;
    return res.status(200).json({
      message: user.isNew
        ? "New user login successful"
        : "Existing user login successful",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong during OAuth" });
  }
};


module.exports = {
  signup,
  login,
  refreshToken,
  logout,
  forgetPassword,
  resetPassword,
  authenticate,
  googleAuthCallback,
};