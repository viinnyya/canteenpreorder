const Stall = require('../models/stall');
const Order = require('../models/order');
const { TRANSITIONS, LABELS } = require('../config/orderStatus');
const { cleanDate } = require('../lib/dates');

const NOTICES = { updated: 'Order status updated.' };
const PAGE_SIZE = 25;

const str = (v) => (typeof v === 'string' ? v : '');

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function currentStall(req) {
  return Stall.findByUserId(req.session.user.id);
}

// Loads the order only if it belongs to the logged-in stall.
function ownedOrder(req, stall) {
  const id = parseId(req.params.id);
  const order = id ? Order.findById(id) : null;
  return order && order.stall_id === stall.id ? order : null;
}

function renderDetail(res, order, extra = {}) {
  res.status(extra.status || 200).render('stall/order-detail', {
    order,
    items: Order.itemsFor(order.id),
    transitions: TRANSITIONS[order.status] || [],
    errors: extra.errors || [],
    notice: extra.notice || null
  });
}

function list(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');

  const tab = req.query.tab === 'all' ? 'all' : 'active';
  const filters = { q: '', status: '', from: '', to: '' };
  const errors = [];
  let page = 1;
  let opts = { activeOnly: true };

  if (tab === 'all') {
    filters.q = str(req.query.q).trim().slice(0, 50);
    filters.status = Object.keys(LABELS).includes(req.query.status) ? req.query.status : '';
    filters.from = cleanDate(req.query.from);
    filters.to = cleanDate(req.query.to);
    if (req.query.from && !filters.from) errors.push('"From" is not a valid date.');
    if (req.query.to && !filters.to) errors.push('"To" is not a valid date.');
    if (filters.from && filters.to && filters.from > filters.to) {
      errors.push('"From" must not be after "To".');
      filters.from = filters.to = '';
    }
    page = Math.max(1, parseInt(req.query.page, 10) || 1);
    opts = { ...filters };
  }

  const total = tab === 'all' ? Order.countByStall(stall.id, opts) : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  page = Math.min(page, pages);
  const orders =
    tab === 'all'
      ? Order.listByStall(stall.id, { ...opts, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      : Order.listByStall(stall.id, opts);

  res.status(errors.length ? 400 : 200).render('stall/orders', {
    stall, tab, orders, filters, errors, page, pages, total
  });
}

function show(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');
  const order = ownedOrder(req, stall);
  if (!order) return res.status(404).render('errors/404');

  renderDetail(res, order, { notice: NOTICES[req.query.notice] });
}

function updateStatus(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');
  const order = ownedOrder(req, stall);
  if (!order) return res.status(404).render('errors/404');

  const next = str(req.body.status);
  const allowed = TRANSITIONS[order.status] || [];
  if (!allowed.includes(next)) {
    return renderDetail(res, order, {
      status: 400,
      errors: ['That status change is not allowed for this order.']
    });
  }

  // Rejecting needs a reason so the student knows what to fix.
  let reason = null;
  if (next === 'rejected') {
    reason = str(req.body.reason).trim();
    if (reason.length < 3 || reason.length > 200) {
      return renderDetail(res, order, {
        status: 400,
        errors: ['Give a reason for rejecting (3 to 200 characters), for example "Amount does not match".']
      });
    }
  }

  if (Order.transition(order.id, order.status, next, reason) === 0) {
    // Someone else changed it first (for example the student cancelled).
    return renderDetail(res, Order.findById(order.id), {
      status: 409,
      errors: ['This order was just changed by someone else. Check its current status and try again.']
    });
  }
  res.redirect('/stall/orders/' + order.id + '?notice=updated');
}

module.exports = { list, show, updateStatus };
