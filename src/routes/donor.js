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
              br.units,
              br.status,
              to_char(br.created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"
       FROM blood_requests br
       JOIN users u ON u.id = br.hospital_id
       WHERE br.status = 'Open'
       ORDER BY br.created_at DESC`
    );

    // later: include distance based on GPS
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
  try {
    const { id } = req.params;

    const exists = await pool.query(
      'SELECT id FROM blood_requests WHERE id=$1 AND status <> $2',
      [id, 'Fulfilled']
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or closed' });
    }

    const result = await pool.query(
      `INSERT INTO donor_responses (request_id, donor_id)
       VALUES ($1,$2)
       RETURNING id, request_id AS "requestId", donor_id AS "donorId",
                 to_char(created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"`,
      [id, req.user.id]
    );

    res.status(201).json({ response: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
