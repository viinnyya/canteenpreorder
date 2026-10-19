const db = require('../config/db');

// Sales only count orders whose payment was verified by the stall.
// Rejected and still-unchecked orders are never revenue.
const PAID = "('accepted','preparing','ready','picked_up','no_show')";

// created_at is stored in UTC; reports group by Philippine date.
const DAY = "date(o.created_at, '+8 hours')";

function range({ from, to }) {
  const clauses = [`o.status IN ${PAID}`];
  const params = [];
  if (from) { clauses.push(`${DAY} >= ?`); params.push(from); }
  if (to) { clauses.push(`${DAY} <= ?`); params.push(to); }
  return { where: clauses.join(' AND '), params };
}

const Report = {
  summary(filter) {
    const { where, params } = range(filter);
    return db
      .prepare(
        `SELECT COUNT(*) AS orders, COALESCE(SUM(o.total), 0) AS revenue,
                COALESCE(ROUND(AVG(o.total), 2), 0) AS average
         FROM orders o WHERE ${where}`
      )
      .get(...params);
  },

  bestSellers(filter, limit = 10) {
    const { where, params } = range(filter);
    return db
      .prepare(
        `SELECT m.name AS item, s.name AS stall,
                SUM(oi.quantity) AS sold, SUM(oi.quantity * oi.price) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN menu_items m ON m.id = oi.menu_item_id
         JOIN stalls s ON s.id = o.stall_id
         WHERE ${where}
         GROUP BY oi.menu_item_id
         ORDER BY sold DESC, revenue DESC, item
         LIMIT ?`
      )
      .all(...params, limit);
  },

  byStall(filter) {
    const { where, params } = range(filter);
    return db
      .prepare(
        `SELECT s.name AS stall, COUNT(o.id) AS orders,
                COALESCE(SUM(o.total), 0) AS revenue
         FROM stalls s
         LEFT JOIN orders o ON o.stall_id = s.id AND ${where}
         GROUP BY s.id
         ORDER BY revenue DESC, s.name`
      )
      .all(...params);
  },

  byDay(filter) {
    const { where, params } = range(filter);
    return db
      .prepare(
        `SELECT ${DAY} AS day, COUNT(*) AS orders, SUM(o.total) AS revenue
         FROM orders o WHERE ${where}
         GROUP BY day ORDER BY day DESC LIMIT 14`
      )
      .all(...params);
  },

  // Busiest hours (Philippine time), useful for stall staffing.
  byHour(filter) {
    const { where, params } = range(filter);
    return db
      .prepare(
        `SELECT CAST(strftime('%H', o.created_at, '+8 hours') AS INTEGER) AS hour,
                COUNT(*) AS orders
         FROM orders o WHERE ${where}
         GROUP BY hour ORDER BY orders DESC, hour LIMIT 5`
      )
      .all(...params);
  },

  // All orders in the period, any status, to show how many were rejected or never picked up.
  statusCounts(filter) {
    const clauses = [];
    const params = [];
    if (filter.from) { clauses.push(`${DAY} >= ?`); params.push(filter.from); }
    if (filter.to) { clauses.push(`${DAY} <= ?`); params.push(filter.to); }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    return db
      .prepare(`SELECT o.status, COUNT(*) AS count FROM orders o ${where} GROUP BY o.status`)
      .all(...params);
  }
};

module.exports = Report;
