import { pool } from "./db.js";

async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW()"); // simple query
    console.log("DB connected successfully:", res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("DB connection failed:", err);
    process.exit(1);
  }
}

testConnection();
