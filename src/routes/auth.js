import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { pool } from "../db.js";

dotenv.config();

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    console.log(req.body);
    const { email, password, role, name, bloodGroup } = req.body;

    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, name, blood_group)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, email, role, name, blood_group`,
      [email, hash, role, name, bloodGroup || null]
    );

    const user = result.rows[0];
    res.status(201).json({ user });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(400).json({ error: "Email already in use" });
    }
    res.status(500).json({ error: e.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1 AND role=$2",
      [email, role]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        bloodGroup: user.blood_group,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
