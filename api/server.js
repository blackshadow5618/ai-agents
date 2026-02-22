require("dotenv").config();
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Pool } = require("pg");
const cors = require("cors");

const analyst = require("./analyst");
const architect = require("./architect");
const planner = require("./planner");
const builder = require("./builder");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use(cors());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  // Port ကို string ကနေ number ပြောင်းပေးဖို့ parseInt သုံးသင့်ပါတယ်
  port: parseInt(process.env.DB_PORT || "5432"),
});

// Connection အဆင်ပြေမပြေ စစ်ဆေးရန် (Optional)
pool.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }
  console.log("✅ Connected to PostgreSQL Database");
  release();
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Database Table ကို အလိုအလျောက် စစ်ဆေး/ဆောက်ပေးခြင်း
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS builds (
      id SERIAL PRIMARY KEY,
      client_data TEXT,
      analysis_report JSONB,
      selected_services JSONB,
      status VARCHAR(50),
      project_path TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};
initDB();

app.post("/api/analyze-options", async (req, res) => {
  try {
    const result = await analyst(req.body.clientData, genAI);
    const dbRes = await pool.query(
      "INSERT INTO builds (client_data, analysis_report, status) VALUES ($1, $2, $3) RETURNING id",
      [req.body.clientData, JSON.stringify(result), "pending"],
    );
    res.json({
      success: true,
      buildId: dbRes.rows[0].id,
      analysis: result.summary,
      services: result.services,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/final-build", async (req, res) => {
  const { buildId, selectedServices, projectPath } = req.body;
  try {
    const buildData = await pool.query("SELECT * FROM builds WHERE id = $1", [
      buildId,
    ]);
    const analysis = buildData.rows[0].analysis_report;

    const blueprint = await architect(analysis, selectedServices, genAI);
    const structure = await planner(blueprint, genAI);
    const status = await builder(structure, projectPath, genAI);

    await pool.query(
      "UPDATE builds SET status = 'completed', project_path = $1 WHERE id = $2",
      [projectPath, buildId],
    );
    res.json({ success: true, message: status, path: projectPath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => console.log("🚀 Server Live at http://localhost:3000"));
module.exports = app;
