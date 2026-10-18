const db = require('../config/db');

const User = {
  findById(id) {
    return db
      .prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
      .get(id);
  },

  findByEmail(email) {
    return db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(String(email).toLowerCase());
  },

  create({ name, email, passwordHash, role }) {
    const result = db
      .prepare(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
      )
      .run(name, String(email).toLowerCase(), passwordHash, role);
    return result.lastInsertRowid;
  },

  listByRole(role) {
    return db
      .prepare('SELECT id, name, email, role, created_at FROM users WHERE role = ?')
      .all(role);
  }
};

module.exports = User;
