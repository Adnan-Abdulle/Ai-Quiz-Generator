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
        const { topic, difficulty, count } = req.body;

        if (!topic) {
            return res.status(400).json({ error: "Topic is required" });
        }
        if (!difficulty) {
            return res.status(400).json({ error: "Difficulty is required" });
        }
        if (!count) {
            return res.status(400).json({ error: "Count is required" });
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: `Generate exactly ${count} ${difficulty} short quiz questions about ${topic}. Return only the questions. Format as a numbered list .`
                    }
                ],
                temperature: 0.7,
                max_tokens: 200
            })
        });

        const textResponse = await response.text();
        console.log("STATUS:", response.status);
        console.log("RAW RESPONSE:", textResponse);

        if (!response.ok) {
            return res.status(response.status).json({
                error: "OpenAI request failed",
                details: textResponse
            });
        }

        if (!textResponse) {
            return res.status(500).json({
                error: "Empty response from OpenAI"
            });
        }

        let data;
        try {
            data = JSON.parse(textResponse);
        } catch {
            return res.status(500).json({
                error: "Invalid JSON from OpenAI",
                raw: textResponse
            });
        }

        const text = data.choices?.[0]?.message?.content || "";

        const questions = text
            .split(/\n|\d+\./)
            .map(q => q.trim())
            .filter(q => q.length > 5)
            .slice(0, Number(count));

        res.json({ questions });

    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).json({
            error: "AI service failed",
            details: error.message
        });
    }
});

app.post("/ai/grade", async (req, res) => {
    try {
        const { questions, answers } = req.body;

        if (!questions || !answers) {
            return res.status(400).json({ error: "Questions and answers are required" });
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: `
You are a quiz answer generator.

Rules:
- Ignore student answers completely.
- Only determine the correct answer for each question.
- Use factual knowledge only.

Questions:
${questions.map((q, i) => `Q${i + 1}: ${q}`).join("\n")}

Return ONLY JSON:

{
  "correct_answers": [
    "answer1",
    "answer2",
    "answer3"
  ]
}
`
                    }
                ],
                temperature: 0.3,
                max_tokens: 150
            })
        });

        const textResponse = await response.text();
        console.log("GRADE STATUS:", response.status);
        console.log("GRADE RAW:", textResponse);

        if (!response.ok) {
            return res.status(response.status).json({
                error: "OpenAI grading failed",
                details: textResponse
            });
        }

        let data;
        try {
            data = JSON.parse(textResponse);
        } catch {
            return res.status(500).json({
                error: "Invalid JSON from OpenAI",
                raw: textResponse
            });
        }

        const text = data.choices?.[0]?.message?.content || "";

        let result;

        try {
           
            result = JSON.parse(text);
        } catch {
            try {
             
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("No JSON found");
                }
            } catch {
                return res.json({
                    score: `0/${questions.length}`,
                    feedback: "AI response parsing failed"
                });
            }
        }

        res.json({
            correct_answers: result.correct_answers || []
        });


    } catch (error) {
        console.error("GRADING ERROR:", error);
        res.status(500).json({
            error: "Grading failed",
            details: error.message
        });
    }
});

app.listen(5001, () => {
    console.log("AI Service running on http://localhost:5001");
});