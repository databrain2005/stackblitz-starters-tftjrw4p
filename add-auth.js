const fs = require('fs');
let content = fs.readFileSync('index.js', 'utf8');

const authCode = `
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
    res.status(500).send(\`Signup error: \${err.message}\`);
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
    res.status(500).send(\`Login error: \${err.message}\`);
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

app.get('/auth/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send('Not logged in');
  }
  res.json({ userId: req.session.userId, orgId: req.session.orgId });
});
`;

content = content.replace(
  "const app = express();",
  "const app = express();\n" + authCode
);

fs.writeFileSync('index.js', content);
console.log('Auth routes added successfully!');
