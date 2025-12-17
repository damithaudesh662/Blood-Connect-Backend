import express from "express";
import { pool } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";
// REMOVED: import admin from 'firebase-admin';
// REMOVED: import serviceAccount from '../service-account.json' assert { type: "json" };
// REMOVED: Firebase initialization block

import { sendSms } from "../services/twilioSms.js ";

const router = express.Router();

router.use(authRequired, requireRole("hospital"));

// --- NEW HELPER FUNCTION TO SEND NOTIFICATION VIA EXPO API ---
const sendExpoPushNotification = async (tokens, title, body, data) => {
  // 1. Format the tokens into an array of message objects for the Expo API
  const messages = tokens.map((token) => ({
    to: token,
    title: title,
    body: body,
    data: data,
    sound: "default", // Plays a default sound
    _displayInForeground: true, // Show notification even if app is open
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const responseData = await response.json();
    console.log("Expo Push Response:", responseData);
    return responseData;
  } catch (error) {
    console.error("Error sending Expo Push Notification:", error);
  }
};
// --- END NEW HELPER FUNCTION ---

router.get("/requests", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          br.id,
          br.blood_type AS "bloodType",
          br.persons,
          br.status,
          br.notes,
          to_char(br.created_at, 'DD Mon YYYY HH24:MI') AS "createdAt",
          -- Count donors who have simply 'Responded'
          COUNT(CASE WHEN dr.status = 'Responded' THEN 1 END)::int AS "respondedCount",
          -- Count donors who have successfully 'Donated'
          COUNT(CASE WHEN dr.status = 'Donated' THEN 1 END)::int AS "donatedCount"
       FROM blood_requests br
       LEFT JOIN donor_responses dr ON br.id = dr.request_id
       WHERE br.hospital_id = $1
       GROUP BY br.id
       ORDER BY br.created_at DESC`,
      [req.user.id]
    );

    res.json({ requests: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// router.post("/requests", async (req, res) => {
//   const start = Date.now();
//   console.log(
//     `\n=== [POST /requests] Started at ${new Date().toISOString()} ===`
//   );
//   console.log("[Req] Body:", JSON.stringify(req.body));

//   try {
//     const { bloodType, persons, notes } = req.body;

//     if (!bloodType || !persons) {
//       console.warn("!! [Validation] Missing bloodType or persons.");
//       return res.status(400).json({ error: "Missing fields" });
//     }

//     // 1. Insert Request
//     console.log("[DB] Inserting new blood request...");
//     const result = await pool.query(
//       `INSERT INTO blood_requests (hospital_id, blood_type, persons, notes)
//        VALUES ($1,$2,$3,$4)
//        RETURNING id,
//                  blood_type AS "bloodType",
//                  persons,
//                  status,
//                  notes,
//                  to_char(created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"`,
//       [req.user.id, bloodType, persons, notes || null]
//     );

//     const newRequest = result.rows[0];
//     console.log(`[DB] Success! Created Request ID: ${newRequest.id}`);

//     // --- NOTIFICATION LOGIC (Wrapped in own try/catch) ---
//     // We do this so if notifications fail, the request creation doesn't "fail" for the user.
//     try {
//       console.log("--- [Notification Sequence Start] ---");

//       // A. Get Hospital Name
//       const hospRes = await pool.query("SELECT name FROM users WHERE id = $1", [
//         req.user.id,
//       ]);
//       const hospitalName = hospRes.rows[0]?.name || "A Hospital";
//       console.log(`[Notify] Hospital Name: "${hospitalName}"`);

//       // B. Get Tokens
//       console.log("[Notify] Querying donor tokens...");
//       const tokensRes = await pool.query(
//         `SELECT fcm_token FROM users WHERE role = 'donor' AND fcm_token IS NOT NULL`
//       );
//       const tokens = tokensRes.rows.map((r) => r.fcm_token);

//       console.log(`[Notify] Found ${tokens.length} donor token(s).`);

//       // C. Send Notification
//       if (tokens.length > 0) {
//         await sendExpoPushNotification(
//           tokens,
//           "Urgent Blood Need!",
//           `${hospitalName} needs ${bloodType} blood. Tap to help!`,
//           {
//             requestId: newRequest.id.toString(),
//             bloodType: newRequest.bloodType,
//           }
//         );
//       } else {
//         console.warn(
//           "[Notify] WARNING: No donors found. Notification skipped."
//         );
//       }
//       console.log("--- [Notification Sequence End] ---");
//     } catch (notifError) {
//       // NON-FATAL ERROR LOGGING
//       console.error("!! [Notification Logic FAILED] !!");
//       console.error("   Error Details:", notifError.message);
//       console.error("   (The blood request was still created successfully)");
//     }

//     // Return success to the frontend
//     res.status(201).json({ request: newRequest });
//     console.log(
//       `=== [POST /requests] Completed in ${Date.now() - start}ms ===\n`
//     );
//   } catch (e) {
//     // FATAL ERRORS (Database constraints, connection issues)
//     console.error("!! [POST /requests] FATAL ERROR:", e);
//     res.status(500).json({ error: e.message });
//   }
// });

router.post("/requests", async (req, res) => {
  const start = Date.now();
  console.log(
    `\n=== [POST /requests] Started at ${new Date().toISOString()} ===`
  );
  console.log("[Req] Body:", JSON.stringify(req.body));

  try {
    const { bloodType, persons, notes, coverage } = req.body;

    if (!bloodType || !persons) {
      console.warn("!! [Validation] Missing bloodType or persons.");
      return res.status(400).json({ error: "Missing fields" });
    }

    const personsNumber = Number(persons);
    if (!Number.isFinite(personsNumber) || personsNumber <= 0) {
      console.warn("!! [Validation] Invalid persons value.");
      return res
        .status(400)
        .json({ error: "persons must be a positive number" });
    }

    let coverageValue = null;
    if (coverage !== undefined && coverage !== null && coverage !== "") {
      const covNum = Number(coverage);
      if (!Number.isFinite(covNum) || covNum <= 0) {
        console.warn("!! [Validation] Invalid coverage value.");
        return res
          .status(400)
          .json({ error: "coverage must be a positive number if provided" });
      }
      coverageValue = covNum;
    }

    // 1. Insert Request
    console.log("[DB] Inserting new blood request...");
    const result = await pool.query(
      `INSERT INTO blood_requests (hospital_id, blood_type, persons, notes, coverage)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id,
                 blood_type AS "bloodType",
                 persons,
                 status,
                 coverage,
                 notes,
                 to_char(created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"`,
      [req.user.id, bloodType, personsNumber, notes || null, coverageValue]
    );

    const newRequest = result.rows[0];
    console.log(`[DB] Success! Created Request ID: ${newRequest.id}`);

    // --- NOTIFICATION LOGIC (non-fatal) ---
    try {
      console.log("--- [Notification Sequence Start] ---");

      // A. Get Hospital Name
      const hospRes = await pool.query("SELECT name FROM users WHERE id = $1", [
        req.user.id,
      ]);
      const hospitalName = hospRes.rows[0]?.name || "A Hospital";
      console.log(`[Notify] Hospital Name: "${hospitalName}"`);

      // B. Get Tokens
      console.log("[Notify] Querying donor tokens...");
      const tokensRes = await pool.query(
        `SELECT fcm_token
         FROM users
         WHERE role = 'donor' AND fcm_token IS NOT NULL`
      );
      const tokens = tokensRes.rows.map((r) => r.fcm_token);

      console.log(`[Notify] Found ${tokens.length} donor token(s).`);

      // C. Send Notification
      if (tokens.length > 0) {
        await sendExpoPushNotification(
          tokens,
          "Urgent Blood Need!",
          `${hospitalName} needs ${bloodType} blood. Tap to help!`,
          {
            requestId: newRequest.id.toString(),
            bloodType: newRequest.bloodType,
          }
        );
      } else {
        console.warn(
          "[Notify] WARNING: No donors found. Notification skipped."
        );
      }
      console.log("--- [Notification Sequence End] ---");

      const smsTo = "+94786405331";
      const smsBody = `${hospitalName} needs ${bloodType} blood for ${personsNumber} patient(s). Please open the Blood Connect app or call the hospital if you can donate.`;

      console.log(`[Twilio] Sending SMS to ${smsTo} ...`);
      await sendSms(smsTo, smsBody);
    } catch (notifError) {
      console.error("!! [Notification Logic FAILED] !!");
      console.error("   Error Details:", notifError.message);
      console.error("   (The blood request was still created successfully)");
    }

    res.status(201).json({ request: newRequest });
    console.log(
      `=== [POST /requests] Completed in ${Date.now() - start}ms ===\n`
    );
  } catch (e) {
    console.error("!! [POST /requests] FATAL ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/hospital/requests/:id
router.put("/requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { bloodType, units } = req.body;

    if (!bloodType || !units) {
      return res
        .status(400)
        .json({ error: "bloodType and units are required" });
    }

    const unitsNumber = Number(units);
    if (!Number.isFinite(unitsNumber) || unitsNumber <= 0) {
      return res.status(400).json({ error: "units must be a positive number" });
    }

    // Ensure request belongs to this hospital (if you track hospital_id)
    const existing = await pool.query(
      `
      SELECT id
      FROM blood_requests
      WHERE id = $1 AND hospital_id = $2
      `,
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    const result = await pool.query(
      `
      UPDATE blood_requests
      SET blood_type = $1,
          persons = $2
      WHERE id = $3
      RETURNING
        id,
        blood_type AS "bloodType",
        persons AS "units",
        status,
        to_char(created_at, 'DD Mon YYYY HH24:MI') AS "createdAt",
        notes
      `,
      [bloodType, unitsNumber, id]
    );

    res.json({ request: result.rows[0] });
  } catch (e) {
    console.error("Error updating hospital request", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/hospital/requests/:id
router.delete("/requests/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ensure the request belongs to this hospital and is closed
    const existing = await pool.query(
      `
      SELECT id
      FROM blood_requests
      WHERE id = $1
        AND hospital_id = $2
        AND status = 'Closed'
      `,
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Closed request not found for this hospital" });
    }

    await pool.query(
      `
      DELETE FROM blood_requests
      WHERE id = $1
      `,
      [id]
    );

    return res.status(204).send();
  } catch (e) {
    console.error("Error deleting hospital request", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
