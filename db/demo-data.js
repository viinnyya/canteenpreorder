// Adds about a month of made-up orders so the sales charts have something to show.
// For demos and screenshots only. Usage: npm run db:setup && npm run db:demo
// Safe to re-run: it stops if demo orders are already there. The orders have no receipt images.
require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { todayManila, addDays } = require('../lib/dates');

if (db.prepare("SELECT COUNT(*) AS n FROM orders WHERE payment_ref LIKE 'DEMO-%'").get().n > 0) {
  console.log('Demo orders are already in this database. Nothing to do.');
  process.exit(0);
}

const stalls = db.prepare('SELECT id, name FROM stalls WHERE active = 1').all();
if (stalls.length === 0) {
  console.log('No stalls found. Run "npm run db:setup" first.');
  process.exit(1);
}

// A small deterministic random generator, so everyone sees the same demo data.
let seed = 20261019;
function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (list) => list[Math.floor(rand() * list.length)];

// Give the demo menus a few categories and a few more items, so the category chart has something to show.
const setCategory = db.prepare("UPDATE menu_items SET category = ? WHERE name = ? AND category = 'Meals'");
setCategory.run('Drinks', 'Iced Coffee');
setCategory.run('Snacks', 'Ensaymada');
setCategory.run('Snacks', 'Pandesal Pack');
const extras = {
  'Aling Rosa Silog': [['Iced Tea', 25, 'Drinks'], ['Turon', 20, 'Snacks'], ['Leche Flan', 35, 'Desserts']],
  'Kape at Tinapay': [['Halo-halo', 55, 'Desserts']]
};
Object.keys(extras).forEach((stallName) => {
  const st = db.prepare('SELECT id FROM stalls WHERE name = ?').get(stallName);
  if (!st) return;
  extras[stallName].forEach(([name, price, category]) => {
    if (!db.prepare('SELECT id FROM menu_items WHERE stall_id = ? AND name = ?').get(st.id, name)) {
      db.prepare('INSERT INTO menu_items (stall_id, name, price, category) VALUES (?, ?, ?, ?)').run(st.id, name, price, category);
    }
  });
});

// Students who place the orders.
const hash = bcrypt.hashSync('student12345', 10);
const insertStudent = db.prepare("INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'student', 'approved')");
for (let i = 1; i <= 5; i++) {
  const email = 'demo.student' + i + '@my.cspc.edu.ph';
  if (!db.prepare('SELECT id FROM users WHERE email = ?').get(email)) insertStudent.run('Demo Student ' + i, email, hash);
}
const students = db.prepare("SELECT id FROM users WHERE role = 'student' AND status = 'approved'").all().map((r) => r.id);

// Busiest around breakfast, lunch and the afternoon break (Philippine hours).
const HOURS = [7, 7, 8, 8, 8, 9, 10, 11, 11, 12, 12, 12, 13, 13, 14, 15, 16, 16, 17];
const REJECT_REASONS = ['Amount does not match', 'Reference number not found', 'Screenshot is unclear'];

const insertOrder = db.prepare(
  `INSERT INTO orders (student_id, stall_id, status, payment_ref, total, reject_reason, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertLine = db.prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)');

const today = todayManila();
let count = 0;

db.transaction(() => {
  stalls.forEach((stall) => {
    const menu = db.prepare('SELECT id, price FROM menu_items WHERE stall_id = ? AND available = 1').all(stall.id);
    if (menu.length === 0) return;

    for (let back = 29; back >= 0; back--) {
      const day = addDays(today, -back);
      const weekday = new Date(day + 'T00:00:00Z').getUTCDay();
      const base = weekday === 0 ? 1 : weekday === 6 ? 3 : 7;
      const orders = Math.max(0, base + Math.floor(rand() * 5) - 1);

      for (let n = 0; n < orders; n++) {
        const hour = pick(HOURS);
        const minute = Math.floor(rand() * 60);
        // Orders for today stop at the current Philippine time so nothing is in the future.
        const manilaNow = new Date(Date.now() + 8 * 3600 * 1000);
        if (back === 0 && (hour > manilaNow.getUTCHours() || (hour === manilaNow.getUTCHours() && minute > manilaNow.getUTCMinutes()))) continue;

        // Convert Philippine time to the UTC time the app stores.
        const utc = new Date(Date.parse(day + 'T00:00:00Z') + (hour * 60 + minute) * 60000 - 8 * 3600 * 1000);
        const stamp = utc.toISOString().slice(0, 19).replace('T', ' ');

        let status = 'picked_up';
        const roll = rand();
        if (back === 0) status = pick(['accepted', 'preparing', 'ready', 'pending_payment', 'picked_up']);
        else if (roll > 0.94) status = 'rejected';
        else if (roll > 0.88) status = 'cancelled';
        else if (roll > 0.84) status = 'no_show';

        const lines = [];
        const used = new Set();
        const kinds = 1 + Math.floor(rand() * 3);
        for (let k = 0; k < kinds; k++) {
          const item = pick(menu);
          if (used.has(item.id)) continue;
          used.add(item.id);
          lines.push({ id: item.id, price: item.price, qty: 1 + Math.floor(rand() * 3) });
        }
        const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
        const reason = status === 'rejected' ? pick(REJECT_REASONS) : null;
        const id = insertOrder.run(pick(students), stall.id, status, 'DEMO-' + (++count), total, reason, stamp, stamp).lastInsertRowid;
        lines.forEach((l) => insertLine.run(id, l.id, l.qty, l.price));
      }
    }
  });
})();

console.log('Added ' + count + ' demo orders across ' + stalls.length + ' stall(s).');
