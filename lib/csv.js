// Tiny CSV reader/writer (RFC 4180 style: quoted fields, doubled quotes, CRLF or LF).

// Returns an array of rows (arrays of strings). Throws Error on an unterminated quote.
function parse(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const src = String(text).replace(/^﻿/, ''); // Excel adds a BOM

  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = ''; rows.push(row); row = []; i++; continue;
    }
    field += ch; i++;
  }
  if (inQuotes) throw new Error('The file has a quoted value that never ends.');
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  // Drop completely empty lines.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// Spreadsheet programs run cells that start with = + - @ as formulas. Neutralise them on export.
function safeCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function quote(s) {
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// rows: array of arrays. Numbers are written as-is (they cannot hold formulas).
function stringify(rows) {
  const body = rows
    .map((r) => r.map((c) => (typeof c === 'number' ? String(c) : quote(safeCell(c)))).join(','))
    .join('\r\n');
  return '﻿' + body + '\r\n';
}

module.exports = { parse, stringify, safeCell };
