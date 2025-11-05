const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// Configure transporter once
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for port 465, false otherwise
  auth: {
    user: process.env.GOOGLE_APP_EMAIL,
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

/**
 * Send an email using the configured transporter
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Rohit Vishwakarma" <${process.env.GOOGLE_APP_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(" Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error(" Error sending email:", error);
    throw new Error("Email not sent");
  }
};

module.exports = { sendEmail };
