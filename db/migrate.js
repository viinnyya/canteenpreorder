// Upgrades an existing database to the current schema. Safe to run many times.
// Fresh databases already get the final schema from schema.sql, so this does nothing for them.

function hasTable(db, name) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
}

function columns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

function addColumn(db, table, name, definition) {
  if (!columns(db, table).includes(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

// The old orders table had a CHECK that did not allow 'cancelled', and SQLite cannot change a CHECK
// in place, so the table is rebuilt once with the new columns and the new status list.
function rebuildOrders(db) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'orders'").get();
  if (!row || row.sql.includes("'cancelled'")) return;

  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE orders_new (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id      INTEGER NOT NULL REFERENCES users(id),
          stall_id        INTEGER NOT NULL REFERENCES stalls(id),
          status          TEXT    NOT NULL DEFAULT 'pending_payment'
                          CHECK (status IN ('pending_payment','accepted','preparing','ready','picked_up','rejected','no_show','cancelled')),
          payment_ref     TEXT,
          screenshot_path TEXT,
          total           REAL    NOT NULL DEFAULT 0,
          reject_reason   TEXT,
          pickup_time     TEXT,
          created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO orders_new (id, student_id, stall_id, status, payment_ref, screenshot_path, total, created_at, updated_at)
          SELECT id, student_id, stall_id, status, payment_ref, screenshot_path, total, created_at, updated_at FROM orders;
        DROP TABLE orders;
        ALTER TABLE orders_new RENAME TO orders;
        CREATE INDEX IF NOT EXISTS idx_orders_student ON orders(student_id);
        CREATE INDEX IF NOT EXISTS idx_orders_stall   ON orders(stall_id);
      `);
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }
  const problems = db.pragma('foreign_key_check');
  if (problems.length > 0) throw new Error('Migration left broken references: ' + JSON.stringify(problems));
}

function migrate(db) {
  if (!hasTable(db, 'users')) return; // brand new database: schema.sql will create everything

  // Existing accounts stay approved; only new student registrations start as 'pending'.
  addColumn(db, 'users', 'status', "TEXT NOT NULL DEFAULT 'approved'");
  addColumn(db, 'stalls', 'active', 'INTEGER NOT NULL DEFAULT 1');
  addColumn(db, 'menu_items', 'category', "TEXT NOT NULL DEFAULT 'Meals'");
  rebuildOrders(db);
}

module.exports = { migrate };
