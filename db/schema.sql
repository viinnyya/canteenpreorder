PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK (role IN ('student', 'stall', 'admin')),
  status        TEXT    NOT NULL DEFAULT 'approved',   -- pending | approved | rejected | disabled
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stalls (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  description TEXT,
  user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  active      INTEGER NOT NULL DEFAULT 1                -- 0 = removed by an admin (history is kept)
);

CREATE TABLE IF NOT EXISTS menu_items (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  stall_id  INTEGER NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
  name      TEXT    NOT NULL,
  price     REAL    NOT NULL CHECK (price >= 0),
  available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
  category  TEXT    NOT NULL DEFAULT 'Meals'
);

CREATE TABLE IF NOT EXISTS orders (
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

CREATE TABLE IF NOT EXISTS order_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  price        REAL    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_student ON orders(student_id);
CREATE INDEX IF NOT EXISTS idx_orders_stall   ON orders(stall_id);
CREATE INDEX IF NOT EXISTS idx_menu_stall     ON menu_items(stall_id);
