const Stall = require('../models/stall');
const User = require('../models/user');

function student(req, res) {
  res.render('dashboards/student', { stalls: Stall.all() });
}

function stall(req, res) {
  const myStall = Stall.findByUserId(req.session.user.id);
  res.render('dashboards/stall', { stall: myStall });
}

function admin(req, res) {
  res.render('dashboards/admin', {
    stalls: Stall.all(),
    stallAccounts: User.listByRole('stall'),
    studentCount: User.listByRole('student').length
  });
}

module.exports = { student, stall, admin };
