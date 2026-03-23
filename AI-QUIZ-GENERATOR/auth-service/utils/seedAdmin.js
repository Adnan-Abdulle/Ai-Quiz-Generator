const bcrypt = require("bcrypt");
const pool = require("../db");
require("dotenv").config();

async function seedAdmin() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD;

        const [rows] = await pool.execute(
            "SELECT id FROM users WHERE email = ?",
            [adminEmail]
        );

        if (rows.length > 0) {
            console.log("Admin already exists");
            return;
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await pool.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')",
            [adminEmail, hashedPassword]
        );

        console.log("Default admin created");
    } catch (err) {
        console.error("SEED ADMIN ERROR:", err);
    }
}

module.exports = seedAdmin;