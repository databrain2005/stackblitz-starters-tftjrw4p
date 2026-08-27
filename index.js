require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const bcrypt = require('bcryptjs');
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

app.post('/auth/signup', async (req, res) => {
  try {
    const { orgId, email, name, password } = req.body;
    if (!orgId || !email || !password) {
      return res.status(400).send('Missing required fields');
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).send('Email already registered');
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (org_id, email, name, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, org_id, email, name',
      [orgId, email, name, hash]
    );
    req.session.userId = result.rows[0].id;
    req.session.orgId = result.rows[0].org_id;
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(`Signup error: ${err.message}`);
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).send('Invalid email or password');
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash || '');
    if (!match) {
      return res.status(401).send('Invalid email or password');
    }
    req.session.userId = user.id;
    req.session.orgId = user.org_id;
    res.json({ id: user.id, org_id: user.org_id, email: user.email, name: user.name });
  } catch (err) {
    res.status(500).send(`Login error: ${err.message}`);
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

app.get('/auth/me', requireAuth, (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send('Not logged in');
  }
  res.json({ userId: req.session.userId, orgId: req.session.orgId });
});

app.use(express.static('public'));
const PORT = 3000;


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
    });

    app.get('/', (req, res) => {
      res.send('DataBrain backend is running');
      });

      app.get('/db-check', async (req, res) => {
        try {
            const result = await pool.query('SELECT NOW()');
                res.send(`Database connected! Server time: ${result.rows[0].now}`);
                  } catch (err) {
                      res.status(500).send(`Database connection failed: ${err.message}`);
                        }
                        });

                        app.get('/orgs/create/:name', async (req, res) => {
                          try {
                              const result = await pool.query(
                                    'INSERT INTO orgs (name) VALUES ($1) RETURNING *',
                                          [req.params.name]
                                              );
                                                  res.json(result.rows[0]);
                                                    } catch (err) {
                                                        res.status(500).send(`Error creating org: ${err.message}`);
                                                          }
                                                          });

                                                          app.get('/orgs', async (req, res) => {
                                                            try {
                                                                const result = await pool.query('SELECT * FROM orgs ORDER BY id');
                                                                    res.json(result.rows);
                                                                      } catch (err) {
                                                                          res.status(500).send(`Error fetching orgs: ${err.message}`);
                                                                            }
                                                                            });

                                                                            app.get('/memory', async (req, res) => {
                                                                                try {
                                                                                    const result = await pool.query('SELECT * FROM business_memory');
                                                                                        res.json(result.rows);
                                                                                          } catch (err) {
                                                                                              res.status(500).send(`Error fetching memory: ${err.message}`);
                                                                                                }
                                                                                                });
                                                                            
     app.get('/memory/create/:orgId/:category/:key/:value', requireAuth, requireOrgAccess, async (req, res) => {
        try {
            const { orgId, category, key, value } = req.params;
                const result = await pool.query(
                      'INSERT INTO business_memory (org_id, category, key, value) VALUES ($1, $2, $3, $4) RETURNING *',
                            [orgId, category, key, value]
                                );
                                    res.json(result.rows[0]);
                                      } catch (err) {
                                          res.status(500).send(`Error creating memory: ${err.message}`);
                                            }
                                            });
     
                                                                            app.get('/users/create/:orgId/:email', requireAuth, requireOrgAccess, async (req, res) => {
                                                                              try {
                                                                                  const result = await pool.query(
                                                                                        'INSERT INTO users (org_id, email) VALUES ($1, $2) RETURNING *',
                                                                                              [req.params.orgId, req.params.email]
                                                                                                  );
                                                                                                      res.json(result.rows[0]);
                                                                                                        } catch (err) {
                                                                                                            res.status(500).send(`Error creating user: ${err.message}`);
                                                                                                              }
                                                                                                              });

                                                                                                              app.get('/users', async (req, res) => {
                                                                                                                try {
                                                                                                                    const result = await pool.query('SELECT * FROM users ORDER BY id');
                                                                                                                        res.json(result.rows);
                                                                                                                          } catch (err) {
                                                                                                                              res.status(500).send(`Error fetching users: ${err.message}`);
                                                                                                                                }
                                                                                                                                });

                                                                                                                                app.listen(PORT, () => {
                                                                                                                                  console.log(`DataBrain server listening on port ${PORT}`);
                                                                                                                                  });
app.put('/connectors/:connectorId/credential', requireAuth, async (req, res) => {
    const { connectorId } = req.params;
      const { credential } = req.body;
        try {
            const check = await pool.query('SELECT org_id FROM connectors WHERE id = $1', [connectorId]);
                if (check.rows.length === 0) return res.status(404).json({ error: 'Connector not found' });
                    if (check.rows[0].org_id !== req.session.orgId) return res.status(403).json({ error: 'Access denied to this org' });

                        await pool.query('UPDATE connectors SET credential = $1 WHERE id = $2', [credential, connectorId]);
                            res.json({ success: true });
                              } catch (err) {
                                  res.status(500).json({ error: err.message });
                                    }
                                    });

                                                                                                                              app.get('/connectors/create/:orgId/:type/:name', requireAuth, requireOrgAccess, async (req, res) => {
                                                                                                                                      try {
                                                                                                                                          const { orgId, type, name } = req.params;
        const credential = req.query.credential || null;
                                                                                                                                              const result = await pool.query(
                                                                                                                                                    'INSERT INTO connectors (org_id, type, name, credential) VALUES ($1, $2, $3, $4) RETURNING id, org_id, type, name, status, created_at',
                                                                                                                                                          [orgId, type, name, credential]
                                                                                                                                                              );
                                                                                                                                                                  res.json(result.rows[0]);
                                                                                                                                                                    } catch (err) {
                                                                                                                                                                        res.status(500).send(`Error creating connector: ${err.message}`);
                                                                                                                                                                          }
                                                                                                                                                                          });
app.get('/connectors/:connectorId/sync-real-stripe', requireAuth, async (req, res) => {
  try {
    const { connectorId } = req.params;
    const connResult = await pool.query('SELECT org_id, credential FROM connectors WHERE id = $1', [connectorId]);
    if (!connResult.rows[0]) {
      return res.status(404).send('Connector not found');
    }
    const { org_id, credential } = connResult.rows[0];
    if (org_id !== req.session.orgId) {
      return res.status(403).json({ error: 'Access denied to this connector' });
    }
    if (!credential) {
      return res.status(400).json({ error: 'This connector has no API key saved' });
    }

    const stripe = require('stripe')(credential);
    const charges = await stripe.charges.list({ limit: 10 });

    for (const charge of charges.data) {
      await pool.query(
        'INSERT INTO connector_data (connector_id, org_id, data) VALUES ($1, $2, $3)',
        [connectorId, org_id, JSON.stringify({
          amount: charge.amount,
          currency: charge.currency,
          description: charge.description || 'Stripe charge',
          created: charge.created
        })]
      );
    }

    res.json({ synced: charges.data.length });
  } catch (err) {
    res.status(500).json({ error: 'Error syncing real Stripe data: ' + err.message });
  }
});


app.delete('/connectors/:connectorId', requireAuth, async (req, res) => {
  try {
    const { connectorId } = req.params;
    const check = await pool.query('SELECT org_id FROM connectors WHERE id = $1', [connectorId]);
    if (!check.rows[0] || check.rows[0].org_id !== req.session.orgId) {
      return res.status(403).json({ error: 'Access denied to this connector' });
    }
    await pool.query('DELETE FROM connectors WHERE id = $1', [connectorId]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting connector: ' + err.message });
  }
});

                                                                                                                                                                          app.get('/connectors/:orgId', requireAuth, requireOrgAccess, async (req, res) => {

                                                                                                                                                                            try {
                                                                                                                                                                                const result = await pool.query(
                                                                                                                                                                                      'SELECT id, org_id, type, name, status, created_at FROM connectors WHERE org_id = $1',
                                                                                                                                                                                            [req.params.orgId]
                                                                                                                                                                                                );
                                                                                                                                                                                                    res.json(result.rows);
                                                                                                                                                                                                      } catch (err) {
                                                                                                                                                                                                          res.status(500).send(`Error fetching connectors: ${err.message}`);
                                                                                                                                                                                                            }
                                                                                                                                                                                                            });
                                                                                                                                  

                                                                                                                                                                                                            app.get('/connectors/:connectorId/sync-fake-stripe', async (req, res) => {
                                                                                                                                                                                                                try {
                                                                                                                                                                                                                    const { connectorId } = req.params;

                                                                                                                                                                                                                        const connectorResult = await pool.query(
                                                                                                                                                                                                                              'SELECT id, org_id, type, name, status, created_at FROM connectors WHERE id = $1',
                                                                                                                                                                                                                                    [connectorId]
                                                                                                                                                                                                                                        );
                                                                                                                                                                                                                                            if (connectorResult.rows.length === 0) {
                                                                                                                                                                                                                                                  return res.status(404).send('Connector not found');
                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                          const orgId = connectorResult.rows[0].org_id;

                                                                                                                                                                                                                                                              const fakeTransactions = [
                                                                                                                                                                                                                                                                    { amount: 4900, currency: 'usd', customer: 'cus_001', description: 'Pro Plan - August' },
                                                                                                                                                                                                                                                                          { amount: 9900, currency: 'usd', customer: 'cus_002', description: 'Business Plan - August' },
                                                                                                                                                                                                                                                                                { amount: 1900, currency: 'usd', customer: 'cus_003', description: 'Starter Plan - August' }
                                                                                                                                                                                                                                                                                    ];

                                                                                                                                                                                                                                                                                        const inserted = [];
                                                                                                                                                                                                                                                                                            for (const tx of fakeTransactions) {
                                                                                                                                                                                                                                                                                                  const result = await pool.query(
                                                                                                                                                                                                                                                                                                          'INSERT INTO connector_data (connector_id, org_id, data) VALUES ($1, $2, $3) RETURNING *',
                                                                                                                                                                                                                                                                                                                  [connectorId, orgId, JSON.stringify(tx)]
                                                                                                                                                                                                                                                                                                                        );
                                                                                                                                                                                                                                                                                                                              inserted.push(result.rows[0]);
                                                                                                                                                                                                                                                                                                                                  }

                                                                                                                                                                                                                                                                                                                                      res.json({ message: 'Fake Stripe data synced!', count: inserted.length, data: inserted });
                                                                                                                                                                                                                                                                                                                                        } catch (err) {
                                                                                                                                                                                                                                                                                                                                            res.status(500).send(`Error syncing data: ${err.message}`);
                                                                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                                                              });

                                                                                                                                                                                                                                                                                                                                              app.get('/connector-data/:orgId', requireAuth, requireOrgAccess, async (req, res) => {
                                                                                                                                                                                                                                                                                                                                                try {
                                                                                                                                                                                                                                                                                                                                                    const result = await pool.query(
                                                                                                                                                                                                                                                                                                                                                          'SELECT * FROM connector_data WHERE org_id = $1',
                                                                                                                                                                                                                                                                                                                                                                [req.params.orgId]
                                                                                                                                                                                                                                                                                                                                                                    );
                                                                                                                                                                                                                                                                                                                                                                        res.json(result.rows);
                                                                                                                                                                                                                                                                                                                                                                          } catch (err) {
                                                                                                                                                                                                                                                                                                                                                                              res.status(500).send(`Error fetching connector data: ${err.message}`);
                                                                                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                                                                                });
                                                                                                                                                                                                            
app.get('/agent/insight/:orgId', requireAuth, requireOrgAccess, async (req, res) => {
    try {
        const { orgId } = req.params;

            const dataResult = await pool.query(
      'SELECT * FROM connector_data WHERE org_id = $1',
                        [orgId]
                            );

                                const memoryResult = await pool.query(
                                      'SELECT * FROM business_memory WHERE org_id = $1',
                                            [orgId]
                                                );

                                                    let totalRevenue = 0;
                                                        const descriptions = [];
                                                            let chargeCount = 0;
    dataResult.rows.forEach(row => {
  if (row.data.created && row.data.amount) {
    chargeCount++;
                                                                          totalRevenue += row.data.amount;
                                                                                }
                                                                                      if (row.data.description) {
                                                                                              descriptions.push(row.data.description);
                                                                                                    }
                                                                                                        });

                                                                                                            const revenueInDollars = (totalRevenue / 100).toFixed(2);

                                                                                                                const memoryNotes = memoryResult.rows.map(
                                                                                                                      m => `${m.key}: ${m.value}`
                                                                                                                          );

                                                                                                                              const insight = `Total revenue: $${revenueInDollars} across ${chargeCount} transactions (${descriptions.join(', ')}). ${memoryNotes.length > 0 ? 'Notes: ' + memoryNotes.join('; ') : ''}`;

                                                                                                                                  res.json({
                                                                                                                                        orgId,
                                                                                                                                              totalRevenue: revenueInDollars,
                                                                                                                                                    transactionCount: chargeCount,
                                                                                                                                                          insight
                                                                                                                                                              });
                                                                                                                                                                } catch (err) {
                                                                                                                                                                    res.status(500).send(`Error generating insight: ${err.message}`);
                                                                                                                                                                      }
                                                                                                                                                                      });


  function requireAuth(req, res, next) {                                                                                                                                                           
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

async function requireOrgAccess(req, res, next) {
  console.log('CHECKING ORG ACCESS:', req.params.orgId, 'session userId:', req.session.userId);
  try {
    const requestedOrgId = parseInt(req.params.orgId);
    const result = await pool.query(
      'SELECT org_id FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (!result.rows[0] || result.rows[0].org_id !== requestedOrgId) {
      return res.status(403).json({ error: "Access denied to this org" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Error checking org access" });
  }
}
