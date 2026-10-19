const express = require('express');
const { requireRole } = require('../middleware/auth');
const admin = require('../controllers/adminController');

const router = express.Router();

router.use('/admin/stalls', requireRole('admin'));

router.get('/admin/stalls', admin.showStalls);
router.post('/admin/stalls', admin.createStall);

module.exports = router;
