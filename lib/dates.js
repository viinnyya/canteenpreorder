// Date helpers. The canteen runs on Philippine time (UTC+8, no daylight saving).
const OFFSET_MS = 8 * 3600 * 1000;

// "2026-10-19" or '' if the text is not a real calendar date.
function cleanDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const d = new Date(v + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? '' : v;
}

function todayManila(now = Date.now()) {
  return new Date(now + OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

// Every date from start to end, inclusive.
function dayList(start, end) {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

// Which days a daily chart shows. No range given: the last 14 days. Never more than 31 columns.
function seriesWindow({ from, to }, today, maxDays = 31, defaultDays = 14) {
  const end = to || (from && from > today ? from : today);
  let start = from || addDays(end, -(defaultDays - 1));
  let truncated = false;
  if (daysBetween(start, end) + 1 > maxDays) {
    start = addDays(end, -(maxDays - 1));
    truncated = true;
  }
  return { start, end, truncated };
}

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

module.exports = { cleanDate, todayManila, OFFSET_MS, addDays, daysBetween, dayList, seriesWindow, readRange };
