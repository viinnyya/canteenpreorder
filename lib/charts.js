// Turns report numbers into the shapes the chart partials draw.
// The charts are plain HTML and CSS (no chart library), so they work offline and print cleanly.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 35740 -> "₱35,740.00"
const peso = (n) =>
  '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function trim(n) {
  return String(Math.round(n * 10) / 10).replace(/\.0$/, '');
}

// 950 -> "950", 1200 -> "1.2K"
function compact(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return trim(n / 1e6) + 'M';
  if (a >= 1000) return trim(n / 1000) + 'K';
  return trim(n);
}

// Rounds the top of the axis up to a clean number whose midpoint is also clean.
// With integer = true (order counts) the top is an even whole number, so the midpoint is whole too.
function niceMax(v, integer) {
  if (!(v > 0)) return integer ? 2 : 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  let max = ([1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((s) => f <= s + 1e-9) || 10) * exp;
  if (integer) max = Math.max(2, Math.ceil(max / 2) * 2);
  return Math.round(max * 1e6) / 1e6;
}

function parts(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return { day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()], weekday: WEEKDAYS[d.getUTCDay()] };
}

// "2026-10-06" -> "6 Oct 2026"
function niceDate(dateStr) {
  const p = parts(dateStr);
  return p.day + ' ' + p.month + ' ' + dateStr.slice(0, 4);
}

function plural(n, word) {
  return n + ' ' + word + (n === 1 ? '' : 's');
}

// opts: value(p), label(p, i), sub(p, i), tip(p), fmt(n) for axis ticks, integer, step
function columns(points, opts) {
  const values = points.map(opts.value);
  const top = Math.max(0, ...values);
  const max = niceMax(top, opts.integer);
  const peakIndex = top > 0 ? values.indexOf(top) : -1;
  const step = opts.step || 1;
  const fmt = opts.fmt || compact;

  return {
    hasData: top > 0,
    ticks: [0, 0.5, 1].map((f) => ({ pct: f * 100, label: fmt(max * f) })),
    cols: points.map((p, i) => {
      const tip = opts.tip(p);
      const shown = i % step === 0 || i === points.length - 1;
      return {
        pct: Math.round((values[i] / max) * 1000) / 10,
        label: shown ? opts.label(p, i) : '',
        sub: shown && opts.sub ? opts.sub(p, i) : '',
        tip,
        aria: tip.replace(/\n/g, ', '),
        peak: i === peakIndex,
        valueLabel: fmt(values[i])
      };
    })
  };
}

// Daily revenue columns. rows = [{ day, orders, revenue }], one per date.
function dailyRevenue(rows) {
  const step = rows.length <= 14 ? 1 : rows.length <= 21 ? 2 : 3;
  return columns(rows, {
    value: (r) => r.revenue,
    label: (r) => String(parts(r.day).day),
    sub: (r, i) => {
      const p = parts(r.day);
      return i === 0 || p.day === 1 ? p.month : '';
    },
    tip: (r) => {
      const p = parts(r.day);
      return p.weekday + ', ' + p.day + ' ' + p.month + '\n' + peso(r.revenue) + ' · ' + plural(r.orders, 'order');
    },
    fmt: (n) => '₱' + compact(n),
    step
  });
}

function hourLabel(h) {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + (h < 12 ? 'a' : 'p');
}

function hourRange(h) {
  const h12 = (x) => (x % 12 === 0 ? 12 : x % 12);
  const suffix = (x) => (x % 24 < 12 ? 'AM' : 'PM');
  return h12(h) + ':00 ' + suffix(h) + ' to ' + h12(h) + ':59 ' + suffix(h);
}

// Orders per hour. rows = 24 entries; the chart trims the empty hours at both ends
// but always shows at least 6 AM to 8 PM, the usual canteen day.
function hourlyOrders(rows) {
  const active = rows.filter((r) => r.orders > 0).map((r) => r.hour);
  const first = Math.min(6, ...(active.length ? active : [6]));
  const last = Math.max(20, ...(active.length ? active : [20]));
  const slice = rows.filter((r) => r.hour >= first && r.hour <= last);
  return columns(slice, {
    value: (r) => r.orders,
    label: (r) => hourLabel(r.hour),
    tip: (r) => hourRange(r.hour) + '\n' + plural(r.orders, 'order') + ' · ' + peso(r.revenue),
    integer: true,
    step: 2
  });
}

// Horizontal bars. items = rows; opts: value(r), name(r), sub(r), display(r), tip(r)
function bars(items, opts) {
  const max = Math.max(0, ...items.map(opts.value));
  return items.map((r) => ({
    name: opts.name(r),
    sub: opts.sub ? opts.sub(r) : '',
    display: opts.display(r),
    tip: opts.tip ? opts.tip(r) : opts.name(r) + ': ' + opts.display(r),
    pct: max > 0 ? Math.round((opts.value(r) / max) * 1000) / 10 : 0
  }));
}

module.exports = { peso, compact, niceMax, columns, dailyRevenue, hourlyOrders, bars, plural, parts, niceDate };
