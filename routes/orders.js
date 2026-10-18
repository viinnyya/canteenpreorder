const express = require('express');
const { requireLogin, requireRole } = require('../middleware/auth');
const orders = require('../controllers/orderController');

const router = express.Router();

router.get('/stalls/:id', requireRole('student'), orders.showStallMenu);
// The role check runs first, so nobody else can upload files here.
router.post('/stalls/:id/order', requireRole('student'), orders.handleUpload, orders.placeOrder);

router.get('/orders', requireRole('student'), orders.listMine);
router.get('/orders/:id', requireRole('student'), orders.showMine);

// Any logged-in role may ask; the controller checks who really owns the order.
router.get('/orders/:id/screenshot', requireLogin, orders.screenshot);

module.exports = router;
