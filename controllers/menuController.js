const Stall = require('../models/stall');
const MenuItem = require('../models/menuItem');
const CATEGORIES = require('../config/categories');
const menuCsv = require('../lib/menuCsv');

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
  const category = str(body.category).trim() || 'Meals';

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

  if (!CATEGORIES.includes(category)) errors.push('Choose a valid category.');

  return { errors, name, price: Math.round(price * 100) / 100, category };
}

function render(req, res, stall, extra = {}) {
  res.status(extra.status || 200).render('stall/menu', {
    stall,
    categories: CATEGORIES,
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
  let notice = NOTICES[req.query.notice];
  if (req.query.notice === 'imported') {
    const added = parseInt(req.query.added, 10) || 0;
    const updated = parseInt(req.query.updated, 10) || 0;
    notice = 'Import finished: ' + added + ' added, ' + updated + ' updated.';
  }
  render(req, res, stall, { notice });
}

function exportCsv(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');
  sendMenuCsv(res, stall);
}

// Shared with the admin pages.
function sendMenuCsv(res, stall) {
  const slug = stall.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stall';
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="menu-' + slug + '.csv"',
    'Cache-Control': 'no-store'
  });
  res.send(menuCsv.toCsv(MenuItem.listByStall(stall.id)));
}

// Returns { errors, result } - result is set only when the whole file was valid and imported.
function runImport(req, stall) {
  if (req.uploadError) return { errors: [req.uploadError] };
  if (!req.file) return { errors: ['Choose a .csv file to import.'] };
  const parsed = menuCsv.parseImport(req.file.buffer.toString('utf8'));
  if (parsed.errors.length > 0) return { errors: parsed.errors };
  return { errors: [], result: MenuItem.importRows(stall.id, parsed.rows) };
}

function importCsv(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');
  const { errors, result } = runImport(req, stall);
  if (errors.length > 0) {
    return render(req, res, stall, { status: 400, errors: ['Import failed, nothing was changed.'].concat(errors) });
  }
  res.redirect('/stall/menu?notice=imported&added=' + result.added + '&updated=' + result.updated);
}

function create(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');

  const { errors, name, price, category } = validateItem(req.body);
  if (errors.length > 0) {
    return render(req, res, stall, {
      status: 400,
      errors,
      values: { name: str(req.body.name), price: str(req.body.price), category: str(req.body.category) }
    });
  }

  MenuItem.create({ stallId: stall.id, name, price, category });
  res.redirect('/stall/menu?notice=added');
}

function update(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');
  const item = ownedItem(req, stall);
  if (!item) return res.status(404).render('errors/404');

  const { errors, name, price, category } = validateItem(req.body);
  if (errors.length > 0) {
    return render(req, res, stall, { status: 400, errors: [item.name + ': ' + errors[0]] });
  }

  MenuItem.update(item.id, { name, price, category });
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

module.exports = { show, create, update, toggle, remove, exportCsv, importCsv, sendMenuCsv, runImport };
