require('dotenv').config();
const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const upload = multer({ storage: multer.memoryStorage() });
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



app.post('/connectors/:connectorId/upload-csv', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { connectorId } = req.params;
    const connResult = await pool.query('SELECT org_id FROM connectors WHERE id = $1', [connectorId]);
    if (!connResult.rows[0]) {
      return res.status(404).send('Connector not found');
    }
    const { org_id } = connResult.rows[0];
    if (org_id !== req.session.orgId) {
      return res.status(403).json({ error: 'Access denied to this connector' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const rows = [];
    const stream = Readable.from(req.file.buffer.toString());
    stream.pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        try {
          for (const row of rows) {
            await pool.query(
              'INSERT INTO connector_data (connector_id, org_id, data) VALUES ($1, $2, $3)',
              [connectorId, org_id, JSON.stringify(row)]
            );
          }
          res.json({ synced: rows.length });
        } catch (innerErr) {
          res.status(500).json({ error: 'Error saving CSV rows: ' + innerErr.message });
        }
      });
  } catch (err) {
    res.status(500).json({ error: 'Error uploading CSV: ' + err.message });
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
  const dailyBreakdown = {};
    dataResult.rows.forEach(row => {
  if (row.data.created && row.data.amount) {
    chargeCount++;
                                                                          totalRevenue += row.data.amount;
      const day = new Date(row.data.created * 1000).toISOString().split('T')[0];
      dailyBreakdown[day] = (dailyBreakdown[day] || 0) + row.data.amount;
                                                                                }
                                                                                      if (row.data.description) {
                                                                                              descriptions.push(row.data.description);
                                                                                                    }
                                                                                                        });

                                                                                                            const revenueInDollars = (totalRevenue / 100).toFixed(2);
    Object.keys(dailyBreakdown).forEach(day => {
      dailyBreakdown[day] = (dailyBreakdown[day] / 100).toFixed(2);
    });

                                                                                                                const memoryNotes = memoryResult.rows.map(
                                                                                                                      m => `${m.key}: ${m.value}`
                                                                                                                          );

                                                                                                                              const insight = `Total revenue: $${revenueInDollars} across ${chargeCount} transactions (${descriptions.join(', ')}). ${memoryNotes.length > 0 ? 'Notes: ' + memoryNotes.join('; ') : ''}`;

                                                                                                                                  res.json({
                                                                                                                                        orgId,
                                                                                                                                              totalRevenue: revenueInDollars,
                                                                                                                                                    transactionCount: chargeCount,
    dailyBreakdown,
                                                                                                                                                          insight
                                                                                                                                                              });
                                                                                                                                                                } catch (err) {
                                                                                                                                                                    res.status(500).send(`Error generating insight: ${err.message}`);
                                                                                                                                                                      }
                                                                                                                                                                      });



app.get('/agent/finance/:orgId', requireAuth, requireOrgAccess, async (req, res) => {
  try {
    const { orgId } = req.params;

    const connectorsResult = await pool.query(
      'SELECT id, type, name FROM connectors WHERE org_id = $1',
      [orgId]
    );
    const connectorMap = {};
    connectorsResult.rows.forEach(c => {
      connectorMap[c.id] = c.type;
    });

    const dataResult = await pool.query(
      'SELECT * FROM connector_data WHERE org_id = $1',
      [orgId]
    );

    const memoryResult = await pool.query(
      'SELECT * FROM business_memory WHERE org_id = $1',
      [orgId]
    );

    let totalRevenue = 0;
    const bySource = {};

    dataResult.rows.forEach(row => {
      const type = connectorMap[row.connector_id] || 'unknown';
      if (!bySource[type]) {
        bySource[type] = { revenue: 0, count: 0 };
      }

      let amount = 0;
      const amountField = ['amount', 'revenue', 'total', 'price'].find(
        f => row.data[f] !== undefined && !isNaN(parseFloat(row.data[f]))
      );
      if (amountField) {
        const rawAmount = parseFloat(row.data[amountField]);
        amount = (amountField === 'amount' && row.data.created) ? rawAmount / 100 : rawAmount;
      }

      bySource[type].revenue += amount;
      bySource[type].count += 1;
      totalRevenue += amount;
    });

    Object.keys(bySource).forEach(type => {
      bySource[type].revenue = bySource[type].revenue.toFixed(2);
    });

    const memoryNotes = memoryResult.rows.map(m => `${m.key}: ${m.value}`);

    const sourceSummary = Object.keys(bySource)
      .map(type => `$${bySource[type].revenue} from ${type} (${bySource[type].count} records)`)
      .join(', ');

    const summary = `Total revenue across all sources: $${totalRevenue.toFixed(2)}. Breakdown: ${sourceSummary || 'no data yet'}. ${memoryNotes.length > 0 ? 'Notes: ' + memoryNotes.join('; ') : ''}`;

    res.json({
      orgId,
      totalRevenue: totalRevenue.toFixed(2),
      bySource,
      summary
    });
  } catch (err) {
    res.status(500).send(`Error generating finance summary: ${err.message}`);
  }
});

app.get('/agent/sales/:orgId', requireAuth, requireOrgAccess, async (req, res) => {
  try {
    const { orgId } = req.params;

    const dataResult = await pool.query(
      'SELECT * FROM connector_data WHERE org_id = $1 ORDER BY synced_at ASC',
      [orgId]
    );

    const memoryResult = await pool.query(
      'SELECT * FROM business_memory WHERE org_id = $1',
      [orgId]
    );

    const transactions = [];

    dataResult.rows.forEach(row => {
      const amountField = ['amount', 'revenue', 'total', 'price'].find(
        f => row.data[f] !== undefined && !isNaN(parseFloat(row.data[f]))
      );
      if (!amountField) return;

      let amount = parseFloat(row.data[amountField]);
      if (amountField === 'amount' && row.data.created) {
        amount = amount / 100;
      }

      const label = row.data.description || row.data.product || row.data.name || 'Unlabeled';

      let txDate;
      if (row.data.created) {
        txDate = new Date(row.data.created * 1000);
      } else if (row.data.date) {
        txDate = new Date(row.data.date);
      } else {
        txDate = new Date(row.synced_at);
      }

      transactions.push({ amount, label, date: txDate });
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = transactions.length;
    const avgTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    const byLabel = {};
    transactions.forEach(t => {
      if (!byLabel[t.label]) byLabel[t.label] = { revenue: 0, count: 0 };
      byLabel[t.label].revenue += t.amount;
      byLabel[t.label].count += 1;
    });

    const topPerformers = Object.entries(byLabel)
      .map(([label, stats]) => ({ label, revenue: stats.revenue.toFixed(2), count: stats.count }))
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
      .slice(0, 5);

    const sortedByDate = [...transactions].sort((a, b) => a.date - b.date);
    const midpoint = Math.floor(sortedByDate.length / 2);
    const firstHalf = sortedByDate.slice(0, midpoint);
    const secondHalf = sortedByDate.slice(midpoint);
    const firstHalfRevenue = firstHalf.reduce((sum, t) => sum + t.amount, 0);
    const secondHalfRevenue = secondHalf.reduce((sum, t) => sum + t.amount, 0);

    let momentum = 'insufficient data';
    let momentumPercent = null;
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      if (firstHalfRevenue === 0) {
        momentum = secondHalfRevenue > 0 ? 'up' : 'flat';
      } else {
        momentumPercent = (((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100).toFixed(1);
        momentum = momentumPercent > 5 ? 'up' : momentumPercent < -5 ? 'down' : 'flat';
      }
    }

    const sortedByAmount = [...transactions].sort((a, b) => b.amount - a.amount);
    const top20Count = Math.max(1, Math.ceil(transactions.length * 0.2));
    const top20Revenue = sortedByAmount.slice(0, top20Count).reduce((sum, t) => sum + t.amount, 0);
    const concentrationPercent = totalRevenue > 0 ? ((top20Revenue / totalRevenue) * 100).toFixed(1) : 0;
    const concentration = concentrationPercent > 60 ? 'high (revenue concentrated in a few transactions)' : 'low (revenue spread across many transactions)';

    const memoryNotes = memoryResult.rows.map(m => `${m.key}: ${m.value}`);

    const topLabel = topPerformers.length > 0 ? topPerformers[0].label : 'none yet';
    const momentumText = momentumPercent !== null ? `${momentum} (${momentumPercent}% change)` : momentum;

    const summary = `Sales momentum: ${momentumText}. Average transaction value: $${avgTransactionValue.toFixed(2)} across ${transactionCount} transactions. Revenue concentration: ${concentration} — top 20% of transactions account for ${concentrationPercent}% of revenue. Top performer: ${topLabel}. ${memoryNotes.length > 0 ? 'Notes: ' + memoryNotes.join('; ') : ''}`;

    res.json({
      orgId,
      totalRevenue: totalRevenue.toFixed(2),
      transactionCount,
      avgTransactionValue: avgTransactionValue.toFixed(2),
      momentum: momentumText,
      concentrationPercent,
      topPerformers,
      summary
    });
  } catch (err) {
    res.status(500).send(`Error generating sales summary: ${err.message}`);
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
