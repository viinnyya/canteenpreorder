const express = require('express');
const { requireRole } = require('../middleware/auth');
const sales = require('../controllers/stallSalesController');

const router = express.Router();

router.use('/stall/sales', requireRole('stall'));

router.get('/stall/sales', sales.show);
router.get('/stall/sales/export.csv', sales.exportCsv);

module.exports = router;
