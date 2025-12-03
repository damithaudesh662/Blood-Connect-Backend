import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true, // enforce verification
    ca: fs.readFileSync("./certs/ca.pem").toString(), // path to your CA
  },
});
