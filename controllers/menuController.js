const Stall = require('../models/stall');
const MenuItem = require('../models/menuItem');

const str = (v) => (typeof v === 'string' ? v : '');

const NOTICES = {
  added: 'Menu item added.',
  updated: 'Menu item updated.',
  toggled: 'Availability changed.',
  removed: 'Menu item removed.'
};

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function currentStall(req) {
  return Stall.findByUserId(req.session.user.id);
}

// Returns { errors, name, price } from the submitted form fields.
function validateItem(body) {
  const errors = [];
  const name = str(body.name).trim();
  const priceRaw = str(body.price).trim();
  const price = Number(priceRaw);

  if (name.length < 2 || name.length > 60) {
    errors.push('Item name must be between 2 and 60 characters.');
  }
  if (priceRaw === '' || !Number.isFinite(price)) {
    errors.push('Enter a valid price.');
  } else if (price <= 0 || price > 10000) {
    errors.push('Price must be more than 0 and at most 10,000.');
  } else if (Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) {
    errors.push('Price can have at most 2 decimal places.');
  }

  return { errors, name, price: Math.round(price * 100) / 100 };
}

function render(req, res, stall, extra = {}) {
  res.status(extra.status || 200).render('stall/menu', {
    stall,
    items: MenuItem.listByStall(stall.id),
    errors: extra.errors || [],
    values: extra.values || {},
    notice: extra.notice || null
  });
}

// Loads the item only if it belongs to the logged-in stall.
function ownedItem(req, stall) {
  const id = parseId(req.params.id);
  const item = id ? MenuItem.findById(id) : null;
  return item && item.stall_id === stall.id ? item : null;
}

function show(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');
  render(req, res, stall, { notice: NOTICES[req.query.notice] });
}

function create(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');

  const { errors, name, price } = validateItem(req.body);
  if (errors.length > 0) {
    return render(req, res, stall, {
      status: 400,
      errors,
      values: { name: str(req.body.name), price: str(req.body.price) }
    });
  }

  MenuItem.create({ stallId: stall.id, name, price });
  res.redirect('/stall/menu?notice=added');
}

function update(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');
  const item = ownedItem(req, stall);
  if (!item) return res.status(404).render('errors/404');

  const { errors, name, price } = validateItem(req.body);
  if (errors.length > 0) {
    return render(req, res, stall, { status: 400, errors: [item.name + ': ' + errors[0]] });
  }

  MenuItem.update(item.id, { name, price });
  res.redirect('/stall/menu?notice=updated');
}

function toggle(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');
  const item = ownedItem(req, stall);
  if (!item) return res.status(404).render('errors/404');

  MenuItem.setAvailable(item.id, !item.available);
  res.redirect('/stall/menu?notice=toggled');
}

function remove(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');
  const item = ownedItem(req, stall);
  if (!item) return res.status(404).render('errors/404');

  // Items that already appear in orders must stay, or old order records would break.
  if (MenuItem.hasOrders(item.id)) {
    return render(req, res, stall, {
      status: 400,
      errors: [item.name + ' is part of past orders, so it cannot be deleted. Mark it unavailable instead.']
    });
  }

  MenuItem.remove(item.id);
  res.redirect('/stall/menu?notice=removed');
}

module.exports = { show, create, update, toggle, remove };
