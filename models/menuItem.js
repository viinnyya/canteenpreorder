const db = require('../config/db');

const MenuItem = {
  listByStall(stallId, { onlyAvailable = false } = {}) {
    const sql =
      'SELECT * FROM menu_items WHERE stall_id = ?' +
      (onlyAvailable ? ' AND available = 1' : '') +
      ' ORDER BY name';
    return db.prepare(sql).all(stallId);
  },

  findById(id) {
    return db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
  },

  create({ stallId, name, price }) {
    return db
      .prepare('INSERT INTO menu_items (stall_id, name, price) VALUES (?, ?, ?)')
      .run(stallId, name, price).lastInsertRowid;
  },

  update(id, { name, price }) {
    db.prepare('UPDATE menu_items SET name = ?, price = ? WHERE id = ?').run(name, price, id);
  },

  setAvailable(id, available) {
    db.prepare('UPDATE menu_items SET available = ? WHERE id = ?').run(available ? 1 : 0, id);
  },

  hasOrders(id) {
    return !!db.prepare('SELECT 1 FROM order_items WHERE menu_item_id = ? LIMIT 1').get(id);
  },

  remove(id) {
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
  }
};

module.exports = MenuItem;
