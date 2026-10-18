const Stall = require('../models/stall');
const Order = require('../models/order');
const { TRANSITIONS } = require('../config/orderStatus');

const NOTICES = { updated: 'Order status updated.' };

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
  res.render('stall/orders', {
    stall,
    tab,
    orders: Order.listByStall(stall.id, { activeOnly: tab === 'active' })
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

  Order.updateStatus(order.id, next);
  res.redirect('/stall/orders/' + order.id + '?notice=updated');
}

module.exports = { list, show, updateStatus };
