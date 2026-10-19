const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const reports = require('../controllers/reportController');

const router = express.Router();

router.get('/admin/reports', requireAdmin, reports.show);

module.exports = router;
