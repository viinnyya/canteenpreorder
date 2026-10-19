const express = require('express');
const { requireRole } = require('../middleware/auth');
const menu = require('../controllers/menuController');
const { uploadCsv } = require('../config/csvUpload');

const router = express.Router();

router.use('/stall/menu', requireRole('stall'));

router.get('/stall/menu', menu.show);
router.get('/stall/menu/export.csv', menu.exportCsv);
router.post('/stall/menu/import', uploadCsv, menu.importCsv);
router.post('/stall/menu', menu.create);
router.post('/stall/menu/:id', menu.update);
router.post('/stall/menu/:id/toggle', menu.toggle);
router.post('/stall/menu/:id/delete', menu.remove);

module.exports = router;
