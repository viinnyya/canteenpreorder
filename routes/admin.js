const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const admin = require('../controllers/adminController');
const { uploadCsv } = require('../config/csvUpload');

const router = express.Router();

router.use('/admin/stalls', requireAdmin);
router.use('/admin/students', requireAdmin);

router.get('/admin/stalls', admin.showStalls);
router.post('/admin/stalls', admin.createStall);
router.post('/admin/stalls/:id/remove', admin.removeStall);
router.post('/admin/stalls/:id/restore', admin.restoreStall);
router.get('/admin/stalls/:id/menu.csv', admin.exportStallMenu);
router.post('/admin/stalls/:id/menu-import', uploadCsv, admin.importStallMenu);

router.get('/admin/students', admin.showStudents);
router.post('/admin/students/:id/approve', admin.approveStudent);
router.post('/admin/students/:id/reject', admin.rejectStudent);

module.exports = router;
