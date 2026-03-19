const bcrypt = require("bcrypt");
const db = require("./db");
require("dotenv").config();

async function initDb() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD;

        const [rows] = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            [adminEmail]
        );

        if (rows.length === 0) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            await db.execute(
                "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
                [adminEmail, hashedPassword, "admin"]
            );

            console.log("Default admin created.");
        } else {
            console.log("Admin already exists.");
        }
    } catch (err) {
        //console.error("initDb error:", err.message);
            console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
    }
}

module.exports = initDb;