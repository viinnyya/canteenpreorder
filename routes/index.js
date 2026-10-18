   const express = require('express');
   const { homeFor } = require('../controllers/authController');

   const router = express.Router();

   router.use('/', require('./auth'));
   router.use('/', require('./dashboard'));
   router.use('/', require('./menu'));

   // Home: send logged-in users to their own page, everyone else to login.
   router.get('/', (req, res) => {
     if (req.session.user) return res.redirect(homeFor(req.session.user.role));
     res.redirect('/login');
   });

   module.exports = router;