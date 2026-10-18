const express = require('express');
const { requireRole } = require('../middleware/auth');
const stallOrders = require('../controllers/stallOrderController');

const router = express.Router();

router.use('/stall/orders', requireRole('stall'));

router.get('/stall/orders', stallOrders.list);
router.get('/stall/orders/:id', stallOrders.show);
router.post('/stall/orders/:id/status', stallOrders.updateStatus);

module.exports = router;
