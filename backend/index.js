require("dotenv").config(); // for local env

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

/* ================= DB CONNECTION ================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to DB successfully"))
  .catch((err) => console.log("DB error:", err.message));

/* ================= MODEL ================= */

const Credential = mongoose.model("credential", {}, "bulkmail");

/* ================= EMAIL VALIDATION ================= */

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

/* ================= ROUTES ================= */

// Health check (important for Render)
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.post("/sendmail", async function (req, res) {
  const { msg, email } = req.body;

  // Validation
  if (!msg || !Array.isArray(email) || email.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Message and email list are required.",
    });
  }

  try {
    const validEmails = email
      .map((item) => String(item).trim())
      .filter((item) => isValidEmail(item));

    if (validEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid email addresses found.",
      });
    }

    /* ========= GET EMAIL CREDENTIALS ========= */

    // OPTION 1 (Recommended): ENV VARIABLES
    const user = process.env.EMAIL;
    const pass = process.env.PASS;

    // OPTION 2 (your DB way - keep as fallback)
    /*
    const data = await Credential.findOne().lean();
    const user = data?.user;
    const pass = data?.pass;
    */

    if (!user || !pass) {
      return res.status(500).json({
        success: false,
        message: "Email credentials not configured.",
      });
    }

    /* ========= TRANSPORTER ========= */

    const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user,
    pass,
  },
  connectionTimeout: 10000,
});
    /* ========= SEND EMAILS (SAFE WAY) ========= */

    for (let e of validEmails) {
      await transporter.sendMail({
        from: user,
        to: e,
        subject: "Bulk Mail",
        text: msg,
      });

      // Delay to avoid Gmail blocking
      await new Promise((r) => setTimeout(r, 500));
    }

    res.json({
      success: true,
      message: `Emails sent successfully to ${validEmails.length} users`,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send emails.",
    });
  }
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, function () {
  console.log("Server is running on port " + PORT);
});