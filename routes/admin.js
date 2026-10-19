const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const admin = require('../controllers/adminController');

const router = express.Router();

router.use('/admin/stalls', requireAdmin);
router.use('/admin/students', requireAdmin);

router.get('/admin/stalls', admin.showStalls);
router.post('/admin/stalls', admin.createStall);

router.get('/admin/students', admin.showStudents);
router.post('/admin/students/:id/approve', admin.approveStudent);
router.post('/admin/students/:id/reject', admin.rejectStudent);

module.exports = router;
