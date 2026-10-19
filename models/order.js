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
  create({ studentId, stallId, items, paymentRef, screenshotPath, pickupTime = null }) {
    const run = db.transaction(() => {
      const total =
        Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

      const orderId = db
        .prepare(
          `INSERT INTO orders (student_id, stall_id, payment_ref, screenshot_path, total, pickup_time)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(studentId, stallId, paymentRef, screenshotPath, total, pickupTime).lastInsertRowid;

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

  // Orders for one stall. Filters (all optional): q (text), status, from/to (Manila dates).
  // The active list is sorted by pickup time so the stall sees what is due first.
  listByStall(stallId, opts = {}) {
    const { where, params } = stallFilter(stallId, opts);
    const order = opts.activeOnly
      ? "ORDER BY COALESCE(o.pickup_time, strftime('%Y-%m-%d %H:%M', o.created_at, '+8 hours')), o.id"
      : 'ORDER BY o.id DESC';
    const paging = opts.limit ? ' LIMIT ? OFFSET ?' : '';
    const extra = opts.limit ? [opts.limit, opts.offset || 0] : [];
    return db.prepare(BASE_SELECT + ` WHERE ${where} ${order}${paging}`).all(...params, ...extra);
  },

  countByStall(stallId, opts = {}) {
    const { where, params } = stallFilter(stallId, opts);
    return db
      .prepare(`SELECT COUNT(*) AS n FROM orders o JOIN users u ON u.id = o.student_id WHERE ${where}`)
      .get(...params).n;
  },

  // Numbers for the stall dashboard (today = Philippine date).
  stallSummary(stallId, today) {
    return db
      .prepare(
        `SELECT
           SUM(CASE WHEN date(created_at, '+8 hours') = ? THEN 1 ELSE 0 END) AS orders_today,
           COALESCE(SUM(CASE WHEN date(created_at, '+8 hours') = ?
                 AND status IN ('accepted','preparing','ready','picked_up','no_show') THEN total END), 0) AS revenue_today,
           SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) AS to_verify,
           SUM(CASE WHEN status IN (${ACTIVE_LIST}) THEN 1 ELSE 0 END) AS active
         FROM orders WHERE stall_id = ?`
      )
      .get(today, today, stallId);
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

  // Changes the status only if the order is still in the expected status (so two people acting at the
  // same moment, e.g. a student cancelling while the stall accepts, cannot both win). Returns rows changed.
  transition(id, from, to, rejectReason = null) {
    return db
      .prepare(
        `UPDATE orders SET status = ?, reject_reason = COALESCE(?, reject_reason), updated_at = datetime('now')
         WHERE id = ? AND status = ?`
      )
      .run(to, rejectReason, id, from).changes;
  }
};

function stallFilter(stallId, { activeOnly = false, q = '', status = '', from = '', to = '' } = {}) {
  const clauses = ['o.stall_id = ?'];
  const params = [stallId];
  if (activeOnly) clauses.push(`o.status IN (${ACTIVE_LIST})`);
  if (status) { clauses.push('o.status = ?'); params.push(status); }
  if (from) { clauses.push("date(o.created_at, '+8 hours') >= ?"); params.push(from); }
  if (to) { clauses.push("date(o.created_at, '+8 hours') <= ?"); params.push(to); }
  if (q) {
    const like = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
    clauses.push("(u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR o.payment_ref LIKE ? ESCAPE '\\' OR CAST(o.id AS TEXT) = ?)");
    params.push(like, like, like, q);
  }
  return { where: clauses.join(' AND '), params };
}

module.exports = Order;
