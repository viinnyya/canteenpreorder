const bcrypt = require('bcrypt');
const User = require('../models/user');

const str = (v) => (typeof v === 'string' ? v : '');

function show(req, res) {
  res.render('account', { errors: [] });
}

async function changePassword(req, res, next) {
  try {
    const current = str(req.body.currentPassword);
    const next1 = str(req.body.newPassword);
    const confirm = str(req.body.confirmPassword);
    const errors = [];

    const row = User.findAuthById(req.session.user.id);
    const currentOk = row ? await bcrypt.compare(current, row.password_hash) : false;

    if (!currentOk) errors.push('Your current password is not correct.');
    if (next1.length < 8) errors.push('The new password must be at least 8 characters.');
    else if (next1.length > 72) errors.push('The new password must be at most 72 characters.');
    if (next1 !== confirm) errors.push('The new passwords do not match.');
    if (currentOk && next1 === current) errors.push('The new password must be different from the current one.');

    if (errors.length > 0) return res.status(400).render('account', { errors });

    User.setPasswordHash(row.id, await bcrypt.hash(next1, 10));
    // Sign out everywhere on this browser so the new password is used from now on.
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      res.redirect('/login?notice=password');
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { show, changePassword };
