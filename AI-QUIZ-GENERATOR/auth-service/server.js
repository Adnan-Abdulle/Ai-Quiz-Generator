require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const initDb = require("./initDb");

const app = express();

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_PROD
  ],
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Auth service is running" });
});

app.use("/auth", authRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initDb();
});