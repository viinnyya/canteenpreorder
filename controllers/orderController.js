const fs = require('fs');
const path = require('path');
const Stall = require('../models/stall');
const MenuItem = require('../models/menuItem');
const CATEGORIES = require('../config/categories');
const Order = require('../models/order');
const { upload, UPLOAD_DIR } = require('../config/upload');

const MAX_ACTIVE_ORDERS = 3;
const MAX_QUANTITY = 20;
const REF_PATTERN = /^[A-Z0-9][A-Z0-9 -]{5,29}$/;

const NOTICES = { placed: 'Order placed! The stall will check your payment soon.' };

const str = (v) => (typeof v === 'string' ? v : '');

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function notFound(res) {
  return res.status(404).render('errors/404');
}

function removeFile(file) {
  if (file && file.path) fs.unlink(file.path, () => {});
}

// The browser's content type can be faked, so also check the file's first bytes.
function looksLikeImage(filePath) {
  const buf = Buffer.alloc(12);
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 12, 0);
  } catch (err) {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  return isJpeg || isPng || isWebp;
}

// Runs multer, but turns upload problems into a message instead of a crash.
function handleUpload(req, res, next) {
  upload.single('screenshot')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') req.uploadError = 'The screenshot must be 3 MB or smaller.';
      else if (err.code === 'INVALID_TYPE') req.uploadError = 'The screenshot must be a JPG, PNG or WEBP image.';
      else req.uploadError = 'The screenshot could not be uploaded. Please try again.';
    }
    next();
  });
}

function showStallMenu(req, res) {
  const id = parseId(req.params.id);
  const stall = id ? Stall.findById(id) : null;
  if (!stall) return notFound(res);

  res.render('student/menu', {
    stall,
    categories: CATEGORIES,
    items: MenuItem.listByStall(stall.id, { onlyAvailable: true }),
    errors: [],
    values: {}
  });
}

function placeOrder(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const stall = id ? Stall.findById(id) : null;
    if (!stall) {
      removeFile(req.file);
      return notFound(res);
    }

    const menu = MenuItem.listByStall(stall.id, { onlyAvailable: true });
    const errors = [];
    const values = {};
    const items = [];

    if (req.uploadError) errors.push(req.uploadError);

    // Quantities come from fields named qty_<menu item id>. Prices always come from the database.
    for (const m of menu) {
      const raw = str(req.body['qty_' + m.id]).trim();
      values['qty_' + m.id] = raw;
      if (raw === '') continue;
      const qty = Number(raw);
      if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QUANTITY) {
        errors.push(m.name + ': quantity must be a whole number from 0 to ' + MAX_QUANTITY + '.');
      } else if (qty > 0) {
        items.push({ menuItemId: m.id, price: m.price, quantity: qty });
      }
    }
    if (items.length === 0 && errors.length === 0) errors.push('Choose at least one item.');

    const paymentRef = str(req.body.paymentRef).trim().toUpperCase();
    values.paymentRef = paymentRef;
    if (!REF_PATTERN.test(paymentRef)) {
      errors.push('Enter the GCash reference number (6 to 30 letters, numbers, spaces or dashes).');
    } else if (Order.paymentRefExists(paymentRef)) {
      errors.push('That reference number was already used for another order.');
    }

    if (!req.file && !req.uploadError) {
      errors.push('Upload a screenshot of your GCash receipt.');
    } else if (req.file && !looksLikeImage(req.file.path)) {
      errors.push('The uploaded file is not a valid image.');
    }

    if (Order.countActiveByStudent(req.session.user.id) >= MAX_ACTIVE_ORDERS) {
      errors.push('You already have ' + MAX_ACTIVE_ORDERS + ' active orders. Wait until one is finished.');
    }

    if (errors.length > 0) {
      removeFile(req.file);
      return res.status(400).render('student/menu', { stall, categories: CATEGORIES, items: menu, errors, values });
    }

    const orderId = Order.create({
      studentId: req.session.user.id,
      stallId: stall.id,
      items,
      paymentRef,
      screenshotPath: req.file.filename
    });
    res.redirect('/orders/' + orderId + '?notice=placed');
  } catch (err) {
    removeFile(req.file);
    next(err);
  }
}

function listMine(req, res) {
  res.render('student/orders', { orders: Order.listByStudent(req.session.user.id) });
}

function showMine(req, res) {
  const id = parseId(req.params.id);
  const order = id ? Order.findById(id) : null;
  // Another student's order looks the same as one that does not exist.
  if (!order || order.student_id !== req.session.user.id) return notFound(res);

  res.render('student/order-detail', {
    order,
    items: Order.itemsFor(order.id),
    notice: NOTICES[req.query.notice] || null
  });
}

// Payment screenshots are private: only the student who ordered, that stall, or an admin.
function screenshot(req, res) {
  const id = parseId(req.params.id);
  const order = id ? Order.findById(id) : null;
  if (!order || !order.screenshot_path) return notFound(res);

  const user = req.session.user;
  let allowed = user.role === 'admin';
  if (user.role === 'student') allowed = order.student_id === user.id;
  if (user.role === 'stall') {
    const stall = Stall.findByUserId(user.id);
    allowed = !!stall && stall.id === order.stall_id;
  }
  if (!allowed) return res.status(403).render('errors/403');

  res.set('Cache-Control', 'private, max-age=0');
  res.set('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.basename(order.screenshot_path), { root: UPLOAD_DIR });
}

module.exports = { handleUpload, showStallMenu, placeOrder, listMine, showMine, screenshot };
