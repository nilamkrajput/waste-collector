require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// To initialize database with connection pool.
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collections (
      id        SERIAL PRIMARY KEY,
      qr_id     TEXT        NOT NULL UNIQUE,
      weight    NUMERIC     NOT NULL,
      points    INTEGER     NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL
    )
  `);
}

app.use(cors());
app.use(express.json());

/**
 *  API to create a new collection record.
 */
app.post("/collections", async (req, res) => {
  const { qr_id, weight, timestamp } = req.body ?? {};

  // qr_id validation for non-empty and required
  if (!qr_id || typeof qr_id !== "string" || qr_id.trim() === "") {
    return res.status(400).json({ error: "qr_id is required." });
  }

  // weight validation for non-negative
  const numWeight = Number(weight);
  if (!weight || Number.isNaN(numWeight) || numWeight <= 0) {
    return res.status(400).json({ error: "weight must be a positive number." });
  }

  const record = {
    qr_id: qr_id.trim(),
    weight: numWeight,
    points: Math.round(numWeight * 15),
    timestamp: timestamp ?? new Date().toISOString(),
  };

  // Inserting record into database
  try {
    await pool.query(
      "INSERT INTO collections (qr_id, weight, points, timestamp) VALUES ($1, $2, $3, $4)",
      [record.qr_id, record.weight, record.points, record.timestamp]
    );
    res.status(201).json(record);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "This bag has already been processed." });
    }
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 *  API to fetch all collection records for dashboard.
 */
app.get("/collections", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT qr_id, weight, points, timestamp FROM collections ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

const PORT = process.env.PORT || 3001;
initDb()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch((err) => { console.error("Failed to initialise DB:", err); process.exit(1); });
