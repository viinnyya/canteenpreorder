const db = require('../config/db');

const User = {
  findById(id) {
    return db
      .prepare('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?')
      .get(id);
  },

  // Full row including the password hash (only for checking a password).
  findAuthById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  findByEmail(email) {
    return db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(String(email).toLowerCase());
  },

  // status: 'pending' for self-registered students, 'approved' for accounts made by an admin.
  create({ name, email, passwordHash, role, status = 'approved' }) {
    const result = db
      .prepare(
        'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)'
      )
      .run(name, String(email).toLowerCase(), passwordHash, role, status);
    return result.lastInsertRowid;
  },

  listByRole(role) {
    return db
      .prepare('SELECT id, name, email, role, status, created_at FROM users WHERE role = ?')
      .all(role);
  },

  listStudentsByStatus(status) {
    return db
      .prepare(
        `SELECT id, name, email, status, created_at FROM users
         WHERE role = 'student' AND status = ? ORDER BY created_at DESC, id DESC`
      )
      .all(status);
  },

  studentCounts() {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    db.prepare("SELECT status, COUNT(*) AS n FROM users WHERE role = 'student' GROUP BY status")
      .all()
      .forEach((r) => { if (r.status in counts) counts[r.status] = r.n; });
    return counts;
  },

  // Only student accounts can be approved/rejected this way.
  setStudentStatus(id, status) {
    return db
      .prepare("UPDATE users SET status = ? WHERE id = ? AND role = 'student'")
      .run(status, id).changes;
  },

  setPasswordHash(id, passwordHash) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  }
};

module.exports = User;
