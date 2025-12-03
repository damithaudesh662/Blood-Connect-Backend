// import express from 'express';
// import { pool } from '../db.js';
// import { authRequired, requireRole } from '../middleware/auth.js';

// const router = express.Router();

// router.use(authRequired, requireRole('donor'));

// router.get('/requests/nearby', async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT br.id,
//               u.name AS "hospitalName",
//               u.email AS "contact",
//               br.blood_type AS "bloodType",
//               br.units,
//               br.status,
//               to_char(br.created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"
//        FROM blood_requests br
//        JOIN users u ON u.id = br.hospital_id
//        WHERE br.status = 'Open'
//        ORDER BY br.created_at DESC`
//     );

//     // later: include distance based on GPS
//     const withDistance = result.rows.map((r) => ({
//       ...r,
//       distanceKm: 2.5,
//       urgency: 'High',
//     }));

//     res.json({ requests: withDistance });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });

// router.post('/requests/:id/respond', async (req, res) => {
//   try {
//     const { id } = req.params;

//     const exists = await pool.query(
//       'SELECT id FROM blood_requests WHERE id=$1 AND status <> $2',
//       [id, 'Fulfilled']
//     );
//     if (exists.rows.length === 0) {
//       return res.status(404).json({ error: 'Request not found or closed' });
//     }

//     const result = await pool.query(
//       `INSERT INTO donor_responses (request_id, donor_id)
//        VALUES ($1,$2)
//        RETURNING id, request_id AS "requestId", donor_id AS "donorId",
//                  to_char(created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"`,
//       [id, req.user.id]
//     );

//     res.status(201).json({ response: result.rows[0] });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });

// export default router;


// backend/src/routes/donor.js
import express from 'express';
import { pool } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authRequired, requireRole('donor'));

router.get('/requests/nearby', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT br.id,
              u.name AS "hospitalName",
              u.email AS "contact",
              br.blood_type AS "bloodType",
              br.persons,
              br.status,
              to_char(br.created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"
       FROM blood_requests br
       JOIN users u ON u.id = br.hospital_id
       WHERE br.status = 'Open'
       ORDER BY br.created_at DESC`
    );

    // Later: compute real distance; for now keep mock distance/urgency
    const withDistance = result.rows.map((r) => ({
      ...r,
      distanceKm: 2.5,
      urgency: 'High',
    }));

    res.json({ requests: withDistance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/requests/:id/respond', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get request with remaining capacity and ensure it's still Open
    const reqResult = await client.query(
      `SELECT id, persons, status
       FROM blood_requests
       WHERE id = $1 AND status = 'Open'
       FOR UPDATE`,
      [id]
    );

    if (reqResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res
        .status(404)
        .json({ error: 'Request not found or already closed' });
    }

    const requestRow = reqResult.rows[0];

    // Optional: prevent same donor from responding twice
    const existing = await client.query(
      `SELECT id FROM donor_responses
       WHERE request_id = $1 AND donor_id = $2`,
      [id, req.user.id]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res
        .status(400)
        .json({ error: 'You have already responded to this request' });
    }

    // Insert donor response
    const responseResult = await client.query(
      `INSERT INTO donor_responses (request_id, donor_id)
       VALUES ($1,$2)
       RETURNING id,
                 request_id AS "requestId",
                 donor_id AS "donorId",
                 to_char(created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"`,
      [id, req.user.id]
    );

    // Count total responses for this request
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM donor_responses
       WHERE request_id = $1`,
      [id]
    );
    const responsesCount = countResult.rows[0].count;
    const personsNeeded = requestRow.persons;

    // If we reached or exceeded required persons, mark as Closed
    if (responsesCount >= personsNeeded) {
      await client.query(
        `UPDATE blood_requests
         SET status = 'Closed'
         WHERE id = $1`,
        [id]
      );
    } else {
      // If partially filled, you can mark as Partially Filled (optional)
      await client.query(
        `UPDATE blood_requests
         SET status = 'Partially Filled'
         WHERE id = $1 AND status = 'Open'`,
        [id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ response: responseResult.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

export default router;
