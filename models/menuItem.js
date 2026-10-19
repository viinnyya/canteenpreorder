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

  create({ stallId, name, price, category = 'Meals' }) {
    return db
      .prepare('INSERT INTO menu_items (stall_id, name, price, category) VALUES (?, ?, ?, ?)')
      .run(stallId, name, price, category).lastInsertRowid;
  },

  update(id, { name, price, category }) {
    db.prepare('UPDATE menu_items SET name = ?, price = ?, category = ? WHERE id = ?').run(
      name,
      price,
      category,
      id
    );
  },

  // Adds new items and updates existing ones (matched by name, ignoring case). All or nothing.
  importRows(stallId, rows) {
    const find = db.prepare('SELECT id FROM menu_items WHERE stall_id = ? AND name = ? COLLATE NOCASE');
    const insert = db.prepare(
      'INSERT INTO menu_items (stall_id, name, price, category, available) VALUES (?, ?, ?, ?, ?)'
    );
    const update = db.prepare(
      'UPDATE menu_items SET name = ?, price = ?, category = ?, available = ? WHERE id = ?'
    );
    let added = 0;
    let updated = 0;
    db.transaction(() => {
      for (const r of rows) {
        const existing = find.get(stallId, r.name);
        if (existing) {
          update.run(r.name, r.price, r.category, r.available, existing.id);
          updated++;
        } else {
          insert.run(stallId, r.name, r.price, r.category, r.available);
          added++;
        }
      }
    })();
    return { added, updated };
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
