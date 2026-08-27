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

                                                      await pool.query(`
                                                            CREATE TABLE IF NOT EXISTS users (
                                                                    id SERIAL PRIMARY KEY,
                                                                            org_id INTEGER REFERENCES orgs(id),
                                                                                    email TEXT NOT NULL UNIQUE,
                                                                                            name TEXT,
                                                                                                    created_at TIMESTAMP DEFAULT NOW()
                                                                                                          );
                                                                                                              `);

                                                                                                                  await pool.query(`
                                                                                                                        CREATE TABLE IF NOT EXISTS business_memory (
                                                                                                                                id SERIAL PRIMARY KEY,
                                                                                                                                        org_id INTEGER REFERENCES orgs(id),
                                                                                                                                                category TEXT NOT NULL,
                                                                                                                                                        key TEXT NOT NULL,
                                                                                                                                                                value TEXT NOT NULL,
                                                                                                                                                                        created_at TIMESTAMP DEFAULT NOW()
                                                                                                                                                                              );
                                                                                                                                                                                  `);

                                                                                                                                                                                      await pool.query(`
                                                                                                                                                                                            CREATE TABLE IF NOT EXISTS connectors (
                                                                                                                                                                                                    id SERIAL PRIMARY KEY,
                                                                                                                                                                                                            org_id INTEGER REFERENCES orgs(id),
                                                                                                                                                                                                                    type TEXT NOT NULL,
                                                                                                                                                                                                                            name TEXT NOT NULL,
                                                                                                                                                                                                                                    status TEXT DEFAULT 'connected',
                                                                                                                                                                                                                                            created_at TIMESTAMP DEFAULT NOW()
                                                                                                                                                                                                                                                  );
                                                                                                                                                                                                                                                      `);

                                                                                                                                                                                                                                                          await pool.query(`
                                                                                                                                                                                                                                                                CREATE TABLE IF NOT EXISTS connector_data (
                                                                                                                                                                                                                                                                        id SERIAL PRIMARY KEY,
                                                                                                                                                                                                                                                                                connector_id INTEGER REFERENCES connectors(id),
                                                                                                                                                                                                                                                                                        org_id INTEGER REFERENCES orgs(id),
                                                                                                                                                                                                                                                                                                data JSONB NOT NULL,
                                                                                                                                                                                                                                                                                                        synced_at TIMESTAMP DEFAULT NOW()
                                                                                                                                                                                                                                                                                                              );
                                                                                                                                                                                                                                                                                                                  `);

                                                                                                                                                                                                                                                                                                                      console.log('All tables ready!');
                                                                                                                                                                                                                                                                                                                        } catch (err) {
                                                                                                                                                                                                                                                                                                                            console.error('Error creating tables:', err.message);
                                                                                                                                                                                                                                                                                                                              } finally {
                                                                                                                                                                                                                                                                                                                                  await pool.end();
                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                                                                                                    setup();










                                                                                                                                
