const Report = require('../models/report');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanDate(v) {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return '';
  const d = new Date(v + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? '' : v;
}

function show(req, res) {
  const errors = [];
  let from = cleanDate(req.query.from);
  let to = cleanDate(req.query.to);
  if (req.query.from && !from) errors.push('"From" is not a valid date.');
  if (req.query.to && !to) errors.push('"To" is not a valid date.');
  if (from && to && from > to) {
    errors.push('"From" must not be after "To".');
    from = to = '';
  }

  const filter = { from, to };
  const best = Report.bestSellers(filter);
  res.status(errors.length ? 400 : 200).render('admin/reports', {
    errors,
    filter,
    summary: Report.summary(filter),
    best,
    maxSold: best.length ? best[0].sold : 0,
    stalls: Report.byStall(filter),
    days: Report.byDay(filter),
    hours: Report.byHour(filter),
    statuses: Report.statusCounts(filter)
  });
}

module.exports = { show };
