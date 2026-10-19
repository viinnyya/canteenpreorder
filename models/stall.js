const db = require('../config/db');

const Stall = {
  all() {
    return db.prepare('SELECT * FROM stalls ORDER BY name').all();
  },

  // Stalls together with their login email, for the admin list.
  allWithAccounts() {
    return db
      .prepare(
        `SELECT s.id, s.name, s.description, u.email, u.created_at
         FROM stalls s JOIN users u ON u.id = s.user_id
         ORDER BY s.name`
      )
      .all();
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
