// Menu <-> CSV. Columns: name, price, category, available
const csv = require('./csv');
const CATEGORIES = require('../config/categories');

const MAX_ROWS = 200;

function toCsv(items) {
  const rows = [['name', 'price', 'category', 'available']];
  items.forEach((i) => rows.push([i.name, Number(i.price).toFixed(2), i.category, i.available ? 1 : 0]));
  return csv.stringify(rows);
}

function parseBool(v) {
  const s = String(v).trim().toLowerCase();
  if (s === '') return 1;
  if (['1', 'yes', 'y', 'true'].includes(s)) return 1;
  if (['0', 'no', 'n', 'false'].includes(s)) return 0;
  return null;
}

// Validates the whole file first. Returns { errors, rows }; nothing is imported unless errors is empty.
function parseImport(text) {
  const errors = [];
  let table;
  try {
    table = csv.parse(text);
  } catch (e) {
    return { errors: [e.message], rows: [] };
  }
  if (table.length === 0) return { errors: ['The file is empty.'], rows: [] };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (n) => header.indexOf(n);
  if (col('name') === -1 || col('price') === -1) {
    return { errors: ['The first line must be a header with at least "name" and "price" columns.'], rows: [] };
  }
  const data = table.slice(1);
  if (data.length === 0) return { errors: ['The file has a header but no items.'], rows: [] };
  if (data.length > MAX_ROWS) return { errors: ['Too many rows (the limit is ' + MAX_ROWS + ' items per file).'], rows: [] };

  const rows = [];
  const seen = new Set();
  data.forEach((r, idx) => {
    const line = idx + 2;
    const get = (n) => (col(n) === -1 ? '' : String(r[col(n)] === undefined ? '' : r[col(n)]).trim());
    // Undo the apostrophe that export adds in front of = + - @
    let name = get('name').replace(/^'(?=[=+\-@])/, '');
    const priceRaw = get('price');
    const price = Number(priceRaw);
    const category = get('category') === '' ? 'Meals' : CATEGORIES.find((c) => c.toLowerCase() === get('category').toLowerCase());
    const available = parseBool(get('available'));

    if (name.length < 2 || name.length > 60) errors.push('Line ' + line + ': name must be 2 to 60 characters.');
    if (priceRaw === '' || !Number.isFinite(price) || price <= 0 || price > 10000 ||
        Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) {
      errors.push('Line ' + line + ': price must be more than 0, at most 10,000, with at most 2 decimals.');
    }
    if (!category) errors.push('Line ' + line + ': category must be one of ' + CATEGORIES.join(', ') + '.');
    if (available === null) errors.push('Line ' + line + ': available must be 1 or 0 (or yes/no).');
    if (seen.has(name.toLowerCase())) errors.push('Line ' + line + ': "' + name + '" appears more than once in the file.');
    seen.add(name.toLowerCase());

    rows.push({ name, price: Math.round(price * 100) / 100, category, available });
  });

  return { errors: errors.slice(0, 10), rows: errors.length ? [] : rows };
}

module.exports = { toCsv, parseImport };
