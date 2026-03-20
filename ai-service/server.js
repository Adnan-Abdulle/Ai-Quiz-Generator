import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/ai/generate", async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic) {
            return res.status(400).json({ error: "Topic is required" });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/llama-3-8b-instruct",
                messages: [
                    {
                        role: "user",
                        content: `Generate exactly 3 short quiz questions about ${topic}`
                    }
                ]
            })
        });

        const data = await response.json();
        console.log("AI RESPONSE:", data);

        const text = data.choices?.[0]?.message?.content || "";

        const questions = text
            .split("\n")
            .filter(q => q.trim() !== "")
            .map(q => q.replace(/^\d+[\).\s-]*/, "").trim());

        res.json({ questions });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "AI service failed" });
    }
});

app.listen(5001, () => {
    console.log("AI Service running on http://localhost:5001");
});