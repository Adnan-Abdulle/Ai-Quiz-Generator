const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require("../db");
const { verifyToken, requireAdmin, requireAdminOrTeacher } = require("../middleware/authMiddleware");

const router = express.Router();

// const fetch = require("node-fetch");

//SMTH setting
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // smtp.mail.yahoo.com
    port: 587,                   // Change from 465 to 587
    secure: false,               // Change from true to false for port 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false  // Helps if there are certificate depth issues on the host
    },
    connectionTimeout: 20000,    // Increase to 20s to give the handshake more time
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
        console.log("=== FORGOT PASSWORD START ===");
        console.log("Request body:", req.body);

        const { email } = req.body;

        if (!email) {
            console.log("❌ No email provided");
            return res.status(400).json({ message: "Email is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        console.log("📧 Normalized email:", normalizedEmail);
        console.log("📧 EMAIL_USER (sender):", process.env.EMAIL_USER);

        // Check user exists
        const [rows] = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            [normalizedEmail]
        );

        console.log("🔍 DB result:", rows);

        if (rows.length === 0) {
            console.log("⚠️ Email not found in DB");
            return res.json({
                message: "If this email exists, a reset link has been sent"
            });
        }

        const user = rows[0];
        console.log("✅ User found:", user.id);

        // Generate token
        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        console.log("🔑 Token generated:", token);
        console.log("⏰ Expires at:", expires);

        // Save token
        await db.execute(
            "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
            [token, expires, user.id]
        );

        console.log("💾 Token saved to DB");

        // const resetLink = `${process.env.FRONTEND_URL}/reset.html?token=${token}`;

        const clientUrl = process.env.FRONTEND_URL_PROD || process.env.FRONTEND_URL;

        const resetLink = `${clientUrl}/reset.html?token=${token}`;

        console.log("🔗 Reset link:", resetLink);

        // Send email
        console.log("📤 Attempting to send email...");

        console.log("before sendMail");

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

        console.log("after sendMail", info);



        console.log("✅ Mail sent successfully!");
        console.log("📬 Response:", info.response);
        console.log("=== FORGOT PASSWORD END ===");

        return res.json({
            message: "If this email exists, a reset link has been sent"
        });

    } catch (err) {
        console.error("❌ Forgot password error FULL:", err);
        return res.status(500).json({
            message: err.message,
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


router.post("/admin/generate-preview", verifyToken, requireAdminOrTeacher, async (req, res) => {
  try {
    const { topic, difficulty, count } = req.body;

    if (!topic || !difficulty || !count) {
      return res.status(400).json({ message: "Topic, difficulty, and count are required" });
    }

    const aiRes = await fetch("https://aacomp4537.com/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ topic, difficulty, count })
    });

    const raw = await aiRes.text();

    let aiData;
    try {
      aiData = JSON.parse(raw);
    } catch {
      return res.status(500).json({ message: "AI returned invalid JSON" });
    }

    if (!aiRes.ok) {
      return res.status(aiRes.status).json({
        message: "AI generation failed",
        error: aiData.error || "Unknown error"
      });
    }

    return res.json({
      questions: aiData.questions
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});


router.post("/admin/publish-quiz", verifyToken, requireAdminOrTeacher, async (req, res) => {
  try {
    const { topic, difficulty, questions } = req.body;

    if (!topic || !difficulty || !questions) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await db.execute(
      `INSERT INTO quizzes (topic, difficulty, question_count, questions, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [topic, difficulty, questions.length, JSON.stringify(questions), req.user.id]
    );

    return res.status(201).json({
      message: "Quiz published successfully"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});


router.get("/user/quizzes", verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT q.*
      FROM quizzes q
      JOIN assignments a ON q.id = a.quiz_id
      WHERE a.user_id = ?
      ORDER BY q.created_at DESC
    `, [req.user.id]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/submit-quiz", verifyToken, async (req, res) => {
    try {
        const { quiz_id, answers } = req.body;
        const user_id = req.user.id;

        const [rows] = await db.execute(
            "SELECT * FROM quizzes WHERE id = ?",
            [quiz_id]
        );

        const quiz = rows[0];

        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }


        let questions;
        if (Array.isArray(quiz.questions)) {
            questions = quiz.questions;
        } else if (typeof quiz.questions === "string") {
            try {
                questions = JSON.parse(quiz.questions);
            } catch {
                questions = quiz.questions.split("\n").filter(q => q.trim() !== "");
            }
        } else {
            questions = [];
        }


        const aiRes = await fetch("http://localhost:5001/ai/grade", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                questions,
                answers
            })
        });

        const raw = await aiRes.text();
        console.log("AI RAW RESPONSE:", raw);

        let aiData;
        try {
            aiData = JSON.parse(raw);
        } catch (e) {
            console.log("⚠️ AI returned NON-JSON, using fallback", raw);

            aiData = {
                score: `0/${questions ? questions.length : answers.length}`,
                feedback: raw || "AI failed to grade properly"
            };
        }

        console.log("AI RESULT:", aiData);

        console.log("FINAL SCORE:", aiData.score);
        console.log("FINAL FEEDBACK:", aiData.feedback);

        // await db.execute(
        //     `INSERT INTO results (user_id, quiz_id, score, feedback)
        //     VALUES (?, ?, ?, ?)`,
        //     [user_id, quiz_id, aiData.score, aiData.feedback]
        // );

        res.json({
            message: "Quiz submitted successfully",
            score: aiData.score,
            feedback: aiData.feedback
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/teacher/assign", verifyToken, requireAdminOrTeacher, async (req, res) => {
    const { quizId, studentIds } = req.body;

    if (!quizId || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "quizId and studentIds are required" });
    }

    try {
        for (const studentId of studentIds) {
            await db.execute(
                "INSERT INTO assignments (quiz_id, user_id, assigned_by) VALUES (?, ?, ?)",
                [quizId, studentId, req.user.id]
            );
        }

        res.json({ message: "Quiz assigned successfully to selected students" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/teacher/results", verifyToken, requireAdminOrTeacher, async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT 
        u.email,
        q.id AS quiz_id,
        q.topic,
        r.score,
        r.feedback
      FROM results r
      JOIN users u ON r.user_id = u.id
      JOIN quizzes q ON r.quiz_id = q.id
      JOIN (
        SELECT user_id, quiz_id, MAX(id) AS latest_id
        FROM results
        GROUP BY user_id, quiz_id
      ) latest
        ON r.id = latest.latest_id
      ORDER BY q.created_at DESC
    `);

        res.json(rows);
    } catch (err) {
        console.error("Teacher results error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Teacher/Admin: view all students/users
router.get("/students", verifyToken, requireAdminOrTeacher, async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, email, role, created_at FROM users ORDER BY id ASC"
        );
        res.json(rows);
    } catch (err) {
        console.error("Error fetching students:", err);
        res.status(500).json({ message: "Failed to fetch students" });
    }
});

// Teacher/Admin: view all quizzes
router.get("/quizzes", verifyToken, requireAdminOrTeacher, async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, topic, difficulty, created_at FROM quizzes ORDER BY created_at DESC"
        );
        res.json(rows);
    } catch (err) {
        console.error("Error fetching quizzes:", err);
        res.status(500).json({ message: "Failed to fetch quizzes" });
    }
});

router.get("/teacher/assignable-students/:quizId", verifyToken, requireAdminOrTeacher, async (req, res) => {
  const { quizId } = req.params;

  try {
    const [rows] = await db.execute(`
      SELECT u.id, u.email, u.role
      FROM users u
      WHERE u.role = 'user'
      AND u.id NOT IN (
        SELECT a.user_id
        FROM assignments a
        WHERE a.quiz_id = ?
      )
      ORDER BY u.id ASC
    `, [quizId]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching assignable students:", err);
    res.status(500).json({ message: "Failed to fetch assignable students" });
  }
});

router.delete("/admin/delete-quiz/:id", verifyToken, requireAdminOrTeacher, async (req, res) => {
  const { id } = req.params;

  try {
    await db.execute("DELETE FROM submissions WHERE quiz_id = ?", [id]);
    await db.execute("DELETE FROM assignments WHERE quiz_id = ?", [id]);
    await db.execute("DELETE FROM quizzes WHERE id = ?", [id]);

    res.json({ message: "Quiz deleted successfully" });
  } catch (err) {
    console.error("Delete quiz error:", err);
    res.status(500).json({ message: "Failed to delete quiz" });
  }
});

module.exports = router;

