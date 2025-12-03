import fs from "fs";

try {
  const ca = fs.readFileSync("./certs/ca.pem").toString();
  console.log("CA file loaded successfully!");
  console.log("First 100 characters of CA:\n", ca.slice(0, 100));
} catch (err) {
  console.error("Failed to read CA file:", err.message);
}
