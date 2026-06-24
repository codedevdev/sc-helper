-- Mirror of migrations (see src-tauri/src/db/migrations.rs)

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    starting_balance REAL NOT NULL DEFAULT 0,
    default_currency TEXT NOT NULL DEFAULT 'aUEC',
    uex_cache_ttl_minutes INTEGER NOT NULL DEFAULT 10,
    uex_api_base TEXT NOT NULL DEFAULT '',
    uex_api_token TEXT NOT NULL DEFAULT '',
    uex_use_rust_http INTEGER NOT NULL DEFAULT 0 CHECK (uex_use_rust_http IN (0, 1)),
    trading_defaults_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS uex_price_snapshots (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (id, starting_balance, default_currency, created_at)
VALUES (1, 0, 'aUEC', datetime('now'));

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'adjustment')),
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    activity_type TEXT NOT NULL DEFAULT '',
    ship_used TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS farming_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    ship_used TEXT NOT NULL DEFAULT '',
    start_balance REAL NOT NULL,
    end_balance REAL NOT NULL,
    expenses REAL NOT NULL DEFAULT 0 CHECK (expenses >= 0),
    net_profit REAL NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    location TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_farming_sessions_created_at ON farming_sessions(created_at);

CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL CHECK (target_amount > 0),
    current_amount_snapshot REAL NOT NULL DEFAULT 0,
    is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

CREATE TABLE IF NOT EXISTS saved_trade_loops (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    legs_json TEXT NOT NULL,
    planner_json TEXT,
    total_profit REAL NOT NULL,
    profit_per_min REAL NOT NULL,
    leg_count INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saved_trade_loops_created
    ON saved_trade_loops(created_at DESC);
