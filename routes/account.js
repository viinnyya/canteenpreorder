const express = require('express');
const { requireLogin } = require('../middleware/auth');
const account = require('../controllers/accountController');

const router = express.Router();

router.get('/account', requireLogin, account.show);
router.post('/account/password', requireLogin, account.changePassword);

module.exports = router;
