import express from "express";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import pool from "../utils/db.js";
import { success, badRequest, error } from "../utils/response.js";

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

router.post("/", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return badRequest(res, "Email is required");
    const lower = String(email).toLowerCase();
    const exists = await pool.query("SELECT * FROM newsletter_subscriptions WHERE email = $1", [lower]);
    if (exists.rows[0]) return success(res, null, "Already subscribed");

    await pool.query("INSERT INTO newsletter_subscriptions (email, verified) VALUES ($1, FALSE)", [lower]);

    const token = uuidv4();
    const base = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const url = `${base}/api/subscribe/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(lower)}`;
    // naive token by placing in URL; for real use, store token table; here we keep simple for newsletter
    if (!process.env.SMTP_HOST) {
      console.log(`[DEV] Newsletter verify for ${lower}: ${url}`);
    } else {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "no-reply@peakself.local",
        to: lower,
        subject: "Confirm your subscription",
        html: `<p>Click to confirm subscription:</p><p><a href="${url}">${url}</a></p>`
      });
    }
    return success(res, null, "Check your email to confirm subscription");
  } catch (e) {
    return error(res, "Subscription failed", 500);
  }
});

router.get("/verify", async (req, res) => {
  try {
    const email = String(req.query.email || "").toLowerCase();
    if (!email) return badRequest(res, "Missing email");
    await pool.query("UPDATE newsletter_subscriptions SET verified = TRUE WHERE email = $1", [email]);
    return success(res, null, "Subscription confirmed");
  } catch (e) {
    return error(res, "Verification failed", 500);
  }
});

export default router;


