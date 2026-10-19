const Stall = require('../models/stall');
const Report = require('../models/report');
const csv = require('../lib/csv');
const charts = require('../lib/charts');
const orderStatus = require('../config/orderStatus');
const { todayManila, addDays, seriesWindow, readRange } = require('../lib/dates');

// Every query here is filtered by the stall that belongs to the logged-in account.
// The stall id never comes from the URL, so one stall cannot look at another's sales.
function currentStall(req) {
  return Stall.findByUserId(req.session.user.id);
}

function presetsFor(today) {
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Last 7 days', from: addDays(today, -6), to: today },
    { label: 'Last 30 days', from: addDays(today, -29), to: today },
    { label: 'All time', from: '', to: '' }
  ];
}

function show(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');

  const { errors, from, to } = readRange(req.query);
  const today = todayManila();
  const filter = { from, to, stallId: stall.id };
  const win = seriesWindow(filter, today);

  const summary = Report.summary(filter);
  const daily = Report.dailySeries(filter, win);
  const best = Report.bestSellers(filter);
  const categories = Report.byCategory(filter);
  const statuses = Report.statusCounts(filter);
  const hourly = Report.hourlySeries(filter);

  const busiest = hourly.reduce((a, b) => (b.orders > a.orders ? b : a), { orders: 0 });

  res.status(errors.length ? 400 : 200).render('stall/sales', {
    stall,
    errors,
    filter: { from, to },
    presets: presetsFor(today),
    summary,
    itemsSold: Report.itemsSold(filter),
    win,
    winLabel: charts.niceDate(win.start) + ' to ' + charts.niceDate(win.end),
    daily,
    dailyChart: charts.dailyRevenue(daily),
    hourChart: charts.hourlyOrders(hourly),
    busiestHour: busiest.orders > 0 ? busiest.hour : null,
    bestRows: charts.bars(best, {
      value: (b) => b.sold,
      name: (b) => b.item,
      display: (b) => b.sold + ' sold · ' + charts.peso(b.revenue),
      tip: (b) => b.item + ': ' + b.sold + ' sold, ' + charts.peso(b.revenue)
    }),
    categoryRows: charts.bars(categories, {
      value: (c) => c.revenue,
      name: (c) => c.category,
      display: (c) => charts.peso(c.revenue),
      tip: (c) => c.category + ': ' + c.sold + ' sold, ' + charts.peso(c.revenue)
    }),
    statuses,
    orderStatus
  });
}

function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'stall';
}

function exportCsv(req, res) {
  const stall = currentStall(req);
  if (!stall) return res.redirect('/stall');

  const { errors, from, to } = readRange(req.query);
  if (errors.length > 0) return res.status(400).type('text/plain').send(errors.join('\n'));

  const rows = [['order_id', 'date', 'time', 'category', 'item', 'quantity', 'unit_price', 'line_total', 'order_status']];
  Report.salesRows({ from, to, stallId: stall.id }).forEach((r) =>
    rows.push([r.order_id, r.date, r.time, r.category, r.item, r.quantity, r.unit_price.toFixed(2), r.line_total.toFixed(2), r.status])
  );

  const label = from || to ? (from || 'start') + '-to-' + (to || 'today') : 'all-time';
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="sales-' + slug(stall.name) + '-' + label + '.csv"',
    'Cache-Control': 'no-store'
  });
  res.send(csv.stringify(rows));
}

module.exports = { show, exportCsv };
