const Stall = require('../models/stall');
const User = require('../models/user');
const Report = require('../models/report');

function student(req, res) {
  res.render('dashboards/student', { stalls: Stall.all() });
}

function stall(req, res) {
  const myStall = Stall.findByUserId(req.session.user.id);
  res.render('dashboards/stall', { stall: myStall });
}

function admin(req, res) {
  // "Today" in Philippine time (UTC+8).
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  res.render('dashboards/admin', {
    stallCount: Stall.all().length,
    counts: User.studentCounts(),
    today: Report.summary({ from: today, to: today }),
    allTime: Report.summary({}),
    best: Report.bestSellers({}, 3)
  });
}

module.exports = { student, stall, admin };
