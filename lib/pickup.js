// Pickup time slots: every 15 minutes, from 15-30 minutes from now up to 3 hours ahead (Philippine time).
// A slot is stored as "YYYY-MM-DD HH:MM" (Manila local time); no slot means "as soon as ready".
const { OFFSET_MS } = require('./dates');

const STEP_MIN = 15;
const LEAD_MIN = 15;
const COUNT = 12;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n) { return String(n).padStart(2, '0'); }

function toValue(d) {
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

function label(value, todayValue) {
  const [date, time] = value.split(' ');
  const [h, m] = time.split(':').map(Number);
  const clock = ((h + 11) % 12 + 1) + ':' + pad(m) + ' ' + (h < 12 ? 'AM' : 'PM');
  if (date === todayValue) return clock;
  const [, mo, da] = date.split('-').map(Number);
  return MONTHS[mo - 1] + ' ' + da + ', ' + clock;
}

function slots(now = Date.now()) {
  const step = STEP_MIN * 60 * 1000;
  const first = Math.ceil((now + LEAD_MIN * 60 * 1000) / step) * step;
  const today = toValue(new Date(now + OFFSET_MS)).split(' ')[0];
  const list = [];
  for (let i = 0; i < COUNT; i++) {
    const value = toValue(new Date(first + i * step + OFFSET_MS));
    list.push({ value, label: label(value, today) });
  }
  return list;
}

// '' means "as soon as ready". Returns { ok, value } where value is null or a valid slot.
function validate(raw, now = Date.now()) {
  if (raw === '' || raw === undefined) return { ok: true, value: null };
  return slots(now).some((s) => s.value === raw) ? { ok: true, value: raw } : { ok: false, value: null };
}

// For display: "As soon as ready" or "Oct 19, 10:30 AM".
function format(value) {
  if (!value) return 'As soon as ready';
  const [date] = value.split(' ');
  const [, mo, da] = date.split('-').map(Number);
  const [h, m] = value.split(' ')[1].split(':').map(Number);
  return MONTHS[mo - 1] + ' ' + da + ', ' + (((h + 11) % 12) + 1) + ':' + pad(m) + ' ' + (h < 12 ? 'AM' : 'PM');
}

module.exports = { slots, validate, format };
