require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orgs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('orgs table created successfully!');
  } catch (err) {
    console.error('Error creating table:', err.message);
  } finally {
    await pool.end();
  }
}

setup();
