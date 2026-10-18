const express = require('express');
const auth = require('../controllers/authController');

const router = express.Router();

// Logged-in users have no reason to see the login or register pages.
function redirectIfLoggedIn(req, res, next) {
  if (req.session.user) return res.redirect(auth.homeFor(req.session.user.role));
  next();
}

router.get('/login', redirectIfLoggedIn, auth.showLogin);
router.post('/login', redirectIfLoggedIn, auth.login);
router.get('/register', redirectIfLoggedIn, auth.showRegister);
router.post('/register', redirectIfLoggedIn, auth.register);
router.post('/logout', auth.logout);

module.exports = router;
