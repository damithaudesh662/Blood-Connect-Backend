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
    const { email, password, role, name, bloodGroup, location } = req.body;

    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Expect location as [lat, lng]
    let locationLat = null;
    let locationLng = null;

    if (Array.isArray(location) && location.length === 2) {
      const [lat, lng] = location;
      if (
        typeof lat === "number" &&
        typeof lng === "number" &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        locationLat = lat;
        locationLng = lng;
      } else {
        return res
          .status(400)
          .json({ error: "Location must be numeric [lat, lng]" });
      }
    } else {
      return res
        .status(400)
        .json({ error: "Location is required as [lat, lng]" });
    }

    const hash = await bcrypt.hash(password, 10);

    console.log(locationLat, locationLng);

    const result = await pool.query(
      `INSERT INTO users (
         email,
         password_hash,
         role,
         name,
         blood_group,
         location_lat,
         location_lng
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING
         id,
         email,
         role,
         name,
         blood_group,
         location_lat AS "locationLat",
         location_lng AS "locationLng"`,
      [email, hash, role, name, bloodGroup || null, locationLat, locationLng]
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
