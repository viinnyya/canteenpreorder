const Report = require('../models/report');
const csv = require('../lib/csv');

const { cleanDate } = require('../lib/dates');

// Reads and validates ?from=&to= . Returns { errors, from, to }.
function readRange(query) {
  const errors = [];
  let from = cleanDate(query.from);
  let to = cleanDate(query.to);
  if (query.from && !from) errors.push('"From" is not a valid date.');
  if (query.to && !to) errors.push('"To" is not a valid date.');
  if (from && to && from > to) {
    errors.push('"From" must not be after "To".');
    from = to = '';
  }
  return { errors, from, to };
}

function show(req, res) {
  const { errors, from, to } = readRange(req.query);
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

function exportCsv(req, res) {
  const { errors, from, to } = readRange(req.query);
  if (errors.length > 0) return res.status(400).type('text/plain').send(errors.join('\n'));

  const rows = [['order_id', 'date', 'time', 'stall', 'category', 'item', 'quantity', 'unit_price', 'line_total', 'order_status']];
  Report.salesRows({ from, to }).forEach((r) =>
    rows.push([r.order_id, r.date, r.time, r.stall, r.category, r.item, r.quantity, r.unit_price.toFixed(2), r.line_total.toFixed(2), r.status])
  );

  const label = from || to ? (from || 'start') + '-to-' + (to || 'today') : 'all-time';
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="sales-' + label + '.csv"',
    'Cache-Control': 'no-store'
  });
  res.send(csv.stringify(rows));
}

module.exports = { show, exportCsv };
