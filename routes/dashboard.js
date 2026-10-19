const express = require('express');
const { requireRole, requireAdmin } = require('../middleware/auth');
const dashboard = require('../controllers/dashboardController');

const router = express.Router();

router.get('/student', requireRole('student'), dashboard.student);
router.get('/stall', requireRole('stall'), dashboard.stall);
router.get('/admin', requireAdmin, dashboard.admin);

module.exports = router;
