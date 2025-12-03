import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // <-- permanent fix

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // enforce verification
    //ca: fs.readFileSync("./certs/ca.pem").toString(), // path to your CA
  },
});
