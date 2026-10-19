const Stall = require('../models/stall');
const User = require('../models/user');
const Report = require('../models/report');
const Order = require('../models/order');
const { todayManila } = require('../lib/dates');

function student(req, res) {
  res.render('dashboards/student', { stalls: Stall.all() });
}

function stall(req, res) {
  const myStall = Stall.findByUserId(req.session.user.id);
  const summary = myStall ? Order.stallSummary(myStall.id, todayManila()) : null;
  res.render('dashboards/stall', { stall: myStall, summary });
}

function admin(req, res) {
  const today = todayManila();
  res.render('dashboards/admin', {
    stallCount: Stall.all().length,
    counts: User.studentCounts(),
    today: Report.summary({ from: today, to: today }),
    allTime: Report.summary({}),
    best: Report.bestSellers({}, 3)
  });
}

module.exports = { student, stall, admin };
