const express = require('express');
const { requireRole } = require('../middleware/auth');
const reports = require('../controllers/reportController');

const router = express.Router();

router.get('/admin/reports', requireRole('admin'), reports.show);

module.exports = router;
