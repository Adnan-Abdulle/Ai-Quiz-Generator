import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());

// 🔍 Debug (optional — remove later)
console.log("GEMINI KEY:", process.env.GEMINI_API_KEY ? "Loaded ✅" : "Missing ❌");

app.post("/ai/generate", async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic) {
            return res.status(400).json({ error: "Topic is required" });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Generate exactly 3 short quiz questions about: ${topic}`
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7
                    }
                })
            }
        );

        const data = await response.json();
        console.log("FULL RESPONSE:", data);

        // ❌ Handle API errors
        if (data.error) {
            return res.status(500).json({
                error: data.error.message || "Gemini API error"
            });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return res.status(500).json({ error: "AI failed to generate content" });
        }

        // ✅ Clean and format output
        const questions = text
            .split("\n")
            .filter(q => q.trim() !== "")
            .map(q => q.replace(/^\d+[\).\s-]*/, "").trim());

        res.json({ questions });

    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).json({ error: "AI service unavailable" });
    }
});

// 🚀 Start server
app.listen(5001, () => {
    console.log("AI Service running on http://localhost:5001");
});