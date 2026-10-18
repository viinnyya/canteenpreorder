const db = require('../config/db');

const Stall = {
  all() {
    return db.prepare('SELECT * FROM stalls ORDER BY name').all();
  },

  findById(id) {
    return db.prepare('SELECT * FROM stalls WHERE id = ?').get(id);
  },

  findByUserId(userId) {
    return db.prepare('SELECT * FROM stalls WHERE user_id = ?').get(userId);
  },

  create({ name, description, userId }) {
    return db
      .prepare('INSERT INTO stalls (name, description, user_id) VALUES (?, ?, ?)')
      .run(name, description || null, userId).lastInsertRowid;
  }
};

module.exports = Stall;
