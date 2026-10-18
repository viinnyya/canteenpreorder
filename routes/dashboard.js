const express = require('express');
const { requireRole } = require('../middleware/auth');
const dashboard = require('../controllers/dashboardController');

const router = express.Router();

router.get('/student', requireRole('student'), dashboard.student);
router.get('/stall', requireRole('stall'), dashboard.stall);
router.get('/admin', requireRole('admin'), dashboard.admin);

module.exports = router;
