const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

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
        return res.status(500).json({ message: "Server error" });
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
        console.error("Login error:", err.message);
        return res.status(500).json({ message: "Server error" });
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
        console.error("Me error:", err.message);
        return res.status(500).json({ message: "Server error" });
    }
});

router.get("/admin/users", verifyToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT id, email, role, api_calls_used, created_at FROM users ORDER BY id ASC"
        );

        return res.json(rows);
    } catch (err) {
        console.error("Admin users error:", err.message);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;