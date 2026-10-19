// Route protection. Use these on any route that must not be open to everyone.
const User = require('../models/user');

// Checks the session against the database on every request, so an admin's decision
// (reject a student, remove a stall) takes effect immediately, not at next login.
function currentUser(req, res) {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    res.redirect('/login');
    return null;
  }
  const dbUser = User.findById(sessionUser.id);
  if (!dbUser || dbUser.status !== 'approved' || dbUser.role !== sessionUser.role) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/login?notice=signedout');
    });
    return null;
  }
  return dbUser;
}

function requireLogin(req, res, next) {
  if (!currentUser(req, res)) return;
  next();
}

// requireRole('admin') or requireRole('stall', 'admin')
function requireRole(...roles) {
  return (req, res, next) => {
    const user = currentUser(req, res);
    if (!user) return;
    if (!roles.includes(user.role)) {
      return res.status(403).render('errors/403');
    }
    next();
  };
}

// Admin pages: admin only, plus the number of students waiting for approval (shown on the tab).
function requireAdmin(req, res, next) {
  requireRole('admin')(req, res, () => {
    res.locals.pendingCount = User.studentCounts().pending;
    next();
  });
}

module.exports = { requireLogin, requireRole, requireAdmin };
