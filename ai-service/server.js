import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/ai/generate", async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic) {
            return res.status(400).json({ error: "Topic is required" });
        }

        const response = await fetch(
            "https://api-inference.huggingface.co/models/google/flan-t5-large",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.HF_API_KEY}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    inputs: `Generate exactly 3 short quiz questions about ${topic}. Format as a numbered list.`,
                    parameters: {
                        max_new_tokens: 100,
                        temperature: 0.7
                    }
                })
            }
        );

        const textResponse = await response.text();

        console.log("RAW RESPONSE:", textResponse);

        let data;
        try {
            data = JSON.parse(textResponse);
        } catch {
            return res.status(500).json({
                error: "Invalid AI response",
                raw: textResponse
            });
        }

        if (data.error) {
            return res.status(500).json({ error: data.error });
        }

        const text = data.generated_text || data[0]?.generated_text || "";

        const questions = text
            .split(/\n|\d+\./)
            .map(q => q.trim())
            .filter(q => q.length > 5)
            .slice(0, 3);

        res.json({ questions });

    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).json({ error: "AI service failed" });
    }
});

app.listen(5001, () => {
    console.log("AI Service running on http://localhost:5001");
});