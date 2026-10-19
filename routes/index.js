const express = require('express');
const { homeFor } = require('../controllers/authController');

const router = express.Router();

router.use('/', require('./auth'));
router.use('/', require('./dashboard'));
router.use('/', require('./menu'));
router.use('/', require('./orders'));
router.use('/', require('./stallOrders'));
router.use('/', require('./stallSales'));
router.use('/', require('./admin'));
router.use('/', require('./reports'));
router.use('/', require('./account'));

// Home: send logged-in users to their own page, everyone else to login.
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect(homeFor(req.session.user.role));
  res.redirect('/login');
});

module.exports = router;
