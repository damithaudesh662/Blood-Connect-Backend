// import express from 'express';
// import { pool } from '../db.js';
// import { authRequired, requireRole } from '../middleware/auth.js';

// const router = express.Router();

// router.use(authRequired, requireRole('hospital'));

// router.get('/requests', async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT id, blood_type AS "bloodType",
//               units, status, notes,
//               to_char(created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"
//        FROM blood_requests
//        WHERE hospital_id = $1
//        ORDER BY created_at DESC`,
//       [req.user.id]
//     );

//     res.json({ requests: result.rows });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });

// router.post('/requests', async (req, res) => {
//   try {
//     const { bloodType, units, notes } = req.body;

//     if (!bloodType || !units) {
//       return res.status(400).json({ error: 'Missing fields' });
//     }

//     const result = await pool.query(
//       `INSERT INTO blood_requests (hospital_id, blood_type, units, notes)
//        VALUES ($1,$2,$3,$4)
//        RETURNING id, blood_type AS "bloodType", units, status, notes,
//                  to_char(created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"`,
//       [req.user.id, bloodType, units, notes || null]
//     );

//     res.status(201).json({ request: result.rows[0] });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });

// export default router;

// backend/src/routes/hospital.js
import express from 'express';
import { pool } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authRequired, requireRole('hospital'));

router.get('/requests', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              blood_type AS "bloodType",
              persons,
              status,
              notes,
              to_char(created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"
       FROM blood_requests
       WHERE hospital_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ requests: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/requests', async (req, res) => {
  try {
    const { bloodType, persons, notes } = req.body;

    if (!bloodType || !persons) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const result = await pool.query(
      `INSERT INTO blood_requests (hospital_id, blood_type, persons, notes)
       VALUES ($1,$2,$3,$4)
       RETURNING id,
                 blood_type AS "bloodType",
                 persons,
                 status,
                 notes,
                 to_char(created_at, 'DD Mon YYYY HH24:MI') AS "createdAt"`,
      [req.user.id, bloodType, persons, notes || null]
    );

    res.status(201).json({ request: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
