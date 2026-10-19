// Creates the tables and seeds demo data.
// Usage: npm run db:setup   (safe to re-run; it will not duplicate seed rows)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('../config/db');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);
require('./migrate').migrate(db);

const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@my.cspc.edu.ph').toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'change-me-before-demo';

const findUser = db.prepare('SELECT id FROM users WHERE email = ?');
const insertUser = db.prepare(
  'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
);

function ensureUser(name, email, password, role) {
  const existing = findUser.get(email);
  if (existing) return existing.id;
  const hash = bcrypt.hashSync(password, 10);
  return insertUser.run(name, email, hash, role).lastInsertRowid;
}

ensureUser('System Admin', adminEmail, adminPassword, 'admin');

// Demo stall accounts + menus (change or remove before real use)
const demoStalls = [
  {
    name: 'Aling Rosa Silog',
    email: 'rosa.stall@my.cspc.edu.ph',
    description: 'Silog meals and rice bowls',
    menu: [
      ['Tapsilog', 75],
      ['Longsilog', 60],
      ['Tosilog', 65]
    ]
  },
  {
    name: 'Kape at Tinapay',
    email: 'kape.stall@my.cspc.edu.ph',
    description: 'Coffee, snacks and pastries',
    menu: [
      ['Iced Coffee', 45],
      ['Ensaymada', 30],
      ['Pandesal Pack', 25]
    ]
  }
];

const findStall = db.prepare('SELECT id FROM stalls WHERE name = ?');
const insertStall = db.prepare(
  'INSERT INTO stalls (name, description, user_id) VALUES (?, ?, ?)'
);
const insertItem = db.prepare(
  'INSERT INTO menu_items (stall_id, name, price) VALUES (?, ?, ?)'
);

for (const s of demoStalls) {
  if (findStall.get(s.name)) continue;
  const userId = ensureUser(s.name, s.email, 'stall12345', 'stall');
  const stallId = insertStall.run(s.name, s.description, userId).lastInsertRowid;
  for (const [name, price] of s.menu) insertItem.run(stallId, name, price);
}

ensureUser('Demo Student', 'student@my.cspc.edu.ph', 'student12345', 'student');

console.log('Database ready at', process.env.DB_PATH || './db/canteen.db');
console.log('Admin account:', adminEmail);
console.log('Demo stall accounts use password: stall12345');
console.log('Demo student account: student@my.cspc.edu.ph / student12345');
