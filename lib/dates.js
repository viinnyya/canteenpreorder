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

module.exports = { cleanDate, todayManila, OFFSET_MS };
