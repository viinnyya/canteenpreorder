const db = require('../config/db');

const Stall = {
  // Stalls students can see (removed stalls are hidden).
  all() {
    return db.prepare('SELECT * FROM stalls WHERE active = 1 ORDER BY name').all();
  },

  // Every stall (including removed ones) with login email and order count, for the admin list.
  allWithAccounts() {
    return db
      .prepare(
        `SELECT s.id, s.name, s.description, s.active, u.email, u.created_at,
                (SELECT COUNT(*) FROM orders o WHERE o.stall_id = s.id) AS order_count
         FROM stalls s JOIN users u ON u.id = s.user_id
         ORDER BY s.active DESC, s.name`
      )
      .all();
  },

  countActiveOrders(id) {
    return db
      .prepare(
        "SELECT COUNT(*) AS n FROM orders WHERE stall_id = ? AND status IN ('pending_payment','accepted','preparing','ready')"
      )
      .get(id).n;
  },

  // "Removing" keeps the stall's orders so past sales stay in the reports; it only
  // hides the stall from students and blocks its login.
  remove(id) {
    db.transaction(() => {
      const stall = db.prepare('SELECT user_id FROM stalls WHERE id = ?').get(id);
      db.prepare('UPDATE stalls SET active = 0 WHERE id = ?').run(id);
      db.prepare("UPDATE users SET status = 'disabled' WHERE id = ?").run(stall.user_id);
    })();
  },

  restore(id) {
    db.transaction(() => {
      const stall = db.prepare('SELECT user_id FROM stalls WHERE id = ?').get(id);
      db.prepare('UPDATE stalls SET active = 1 WHERE id = ?').run(id);
      db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").run(stall.user_id);
    })();
  },

  findById(id) {
    return db.prepare('SELECT * FROM stalls WHERE id = ?').get(id);
  },

  findByUserId(userId) {
    return db.prepare('SELECT * FROM stalls WHERE user_id = ?').get(userId);
  },

  findByName(name) {
    return db.prepare('SELECT * FROM stalls WHERE name = ? COLLATE NOCASE').get(name);
  },

  create({ name, description, userId }) {
    return db
      .prepare('INSERT INTO stalls (name, description, user_id) VALUES (?, ?, ?)')
      .run(name, description || null, userId).lastInsertRowid;
  },

  // Creates the login account and the stall together, or neither.
  createWithAccount({ name, description, email, passwordHash }) {
    const run = db.transaction(() => {
      const userId = db
        .prepare(
          "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'stall')"
        )
        .run(name, String(email).toLowerCase(), passwordHash).lastInsertRowid;
      return db
        .prepare('INSERT INTO stalls (name, description, user_id) VALUES (?, ?, ?)')
        .run(name, description || null, userId).lastInsertRowid;
    });
    return run();
  }
};

module.exports = Stall;
