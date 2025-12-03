import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";
import authRouter from "./routes/auth.js";
import donorRouter from "./routes/donor.js";
import hospitalRouter from "./routes/hospital.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*", // tighten later
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Blood Connect API" });
});

// routers
app.use("/api/auth", authRouter);
app.use("/api/donor", donorRouter);
app.use("/api/hospital", hospitalRouter);

// simple health check for DB
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ db: "up" });
  } catch (e) {
    res.status(500).json({ db: "down", error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});

// app.listen(3000, "0.0.0.0", () => {
//   console.log("API server running on http://0.0.0.0:3000");
// });
