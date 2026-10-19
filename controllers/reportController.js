const Report = require('../models/report');
const csv = require('../lib/csv');

const charts = require('../lib/charts');
const { todayManila, seriesWindow, readRange } = require('../lib/dates');

function show(req, res) {
  const { errors, from, to } = readRange(req.query);
  const filter = { from, to };
  const win = seriesWindow(filter, todayManila());
  const best = Report.bestSellers(filter);
  const stalls = Report.byStall(filter);
  res.status(errors.length ? 400 : 200).render('admin/reports', {
    errors,
    filter,
    summary: Report.summary(filter),
    win,
    winLabel: charts.niceDate(win.start) + ' to ' + charts.niceDate(win.end),
    dailyChart: charts.dailyRevenue(Report.dailySeries(filter, win)),
    hourChart: charts.hourlyOrders(Report.hourlySeries(filter)),
    bestRows: charts.bars(best, {
      value: (b) => b.sold,
      name: (b) => b.item,
      sub: (b) => b.stall,
      display: (b) => b.sold + ' sold \u00B7 ' + charts.peso(b.revenue),
      tip: (b) => b.item + ' (' + b.stall + '): ' + b.sold + ' sold, ' + charts.peso(b.revenue)
    }),
    stallRows: charts.bars(stalls, {
      value: (s) => s.revenue,
      name: (s) => s.stall,
      sub: (s) => s.orders + (s.orders === 1 ? ' order' : ' orders'),
      display: (s) => charts.peso(s.revenue)
    }),
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
