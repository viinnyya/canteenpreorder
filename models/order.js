const db = require('../config/db');
const { ACTIVE } = require('../config/orderStatus');

const ACTIVE_LIST = ACTIVE.map((s) => `'${s}'`).join(', ');

const BASE_SELECT = `
  SELECT o.*, s.name AS stall_name, u.name AS student_name, u.email AS student_email
  FROM orders o
  JOIN stalls s ON s.id = o.stall_id
  JOIN users u ON u.id = o.student_id
`;

const Order = {
  // Creates the order and its items together, or neither if something fails.
  create({ studentId, stallId, items, paymentRef, screenshotPath }) {
    const run = db.transaction(() => {
      const total =
        Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

      const orderId = db
        .prepare(
          `INSERT INTO orders (student_id, stall_id, payment_ref, screenshot_path, total)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(studentId, stallId, paymentRef, screenshotPath, total).lastInsertRowid;

      const insertItem = db.prepare(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)'
      );
      for (const item of items) {
        insertItem.run(orderId, item.menuItemId, item.quantity, item.price);
      }
      return orderId;
    });
    return run();
  },

  findById(id) {
    return db.prepare(BASE_SELECT + ' WHERE o.id = ?').get(id);
  },

  itemsFor(orderId) {
    return db
      .prepare(
        `SELECT oi.quantity, oi.price, mi.name
         FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id
         WHERE oi.order_id = ? ORDER BY mi.name`
      )
      .all(orderId);
  },

  listByStudent(studentId) {
    return db
      .prepare(BASE_SELECT + ' WHERE o.student_id = ? ORDER BY o.id DESC')
      .all(studentId);
  },

  listByStall(stallId, { activeOnly = false } = {}) {
    const filter = activeOnly ? ` AND o.status IN (${ACTIVE_LIST})` : '';
    return db
      .prepare(BASE_SELECT + ` WHERE o.stall_id = ?${filter} ORDER BY o.id DESC`)
      .all(stallId);
  },

  countActiveByStudent(studentId) {
    return db
      .prepare(
        `SELECT COUNT(*) AS n FROM orders WHERE student_id = ? AND status IN (${ACTIVE_LIST})`
      )
      .get(studentId).n;
  },

  paymentRefExists(paymentRef) {
    return !!db.prepare('SELECT 1 FROM orders WHERE payment_ref = ? LIMIT 1').get(paymentRef);
  },

  updateStatus(id, status) {
    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
      status,
      id
    );
  }
};

module.exports = Order;
