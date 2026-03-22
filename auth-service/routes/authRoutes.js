const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require("../db");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // VERY IMPORTANT for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
    if (error) {
        console.error("SMTP verify error:", error);
    } else {
        console.log("SMTP server is ready");
    }
});

router.post("/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [existing] = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
            [normalizedEmail, hashedPassword, "user"]
        );

        return res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        console.error("REGISTER ERROR FULL:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [rows] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                api_calls_used: user.api_calls_used
            }
        });
    } catch (err) {
        console.error("Login error FULL:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        console.log("forgot-password hit with:", normalizedEmail);
        console.log("EMAIL_USER:", process.env.EMAIL_USER);

        const [rows] = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (rows.length === 0) {
            return res.json({
                message: "If this email exists, a reset link has been sent"
            });
        }

        const user = rows[0];
        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        await db.execute(
            "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
            [token, expires, user.id]
        );

const resetLink = `${process.env.FRONTEND_URL}/reset.html?token=${token}`;
        console.log("Sending reset email to:", normalizedEmail);
        console.log("Reset link:", resetLink);

        const info = await transporter.sendMail({
            from: `"AI Quiz App" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: "Password Reset Request",
            html: `
                <h2>Password Reset</h2>
                <p>You requested to reset your password.</p>
                <p>Click the button below:</p>
                <p>
                    <a href="${resetLink}" 
                       style="padding:10px 15px; background:#4CAF50; color:white; text-decoration:none; border-radius:5px;">
                       Reset Password
                    </a>
                </p>
                <p>If the button does not work, use this link:</p>
                <p>${resetLink}</p>
                <p>If you did not request this, you can ignore this email.</p>
                <p>This link expires in 15 minutes.</p>
            `
        });

        console.log("Mail sent:", info);

        return res.json({
            message: "If this email exists, a reset link has been sent"
        });
    } catch (err) {
        console.error("Forgot password error FULL:", err);
        return res.status(500).json({
            message: "Forgot password failed",
            error: err.message
        });
    }
});

router.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: "Token and new password are required" });
        }

        const [rows] = await db.execute(
            "SELECT id, reset_token_expires FROM users WHERE reset_token = ?",
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: "Invalid token" });
        }

        const user = rows[0];

        if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
            return res.status(400).json({ message: "Token expired" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.execute(
            "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
            [hashedPassword, user.id]
        );

        return res.json({ message: "Password reset successful" });
    } catch (err) {
        console.error("Reset password error FULL:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/me", verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT id, email, role, api_calls_used, created_at FROM users WHERE id = ?",
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json(rows[0]);
    } catch (err) {
        console.error("Me error FULL:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/admin/users", verifyToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT id, email, role, api_calls_used, created_at FROM users ORDER BY id ASC"
        );

        return res.json(rows);
    } catch (err) {
        console.error("Admin users error FULL:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;