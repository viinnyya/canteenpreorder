// Route protection. Use these on any route that must not be open to everyone.

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// requireRole('admin') or requireRole('stall', 'admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render('errors/403');
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
