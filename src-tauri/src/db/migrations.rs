use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: r#"
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    starting_balance REAL NOT NULL DEFAULT 0,
    currency_label TEXT NOT NULL DEFAULT 'aUEC',
    updated_at TEXT
);

INSERT OR IGNORE INTO settings (id, starting_balance, currency_label)
VALUES (1, 0, 'aUEC');

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'adjustment')),
    amount REAL NOT NULL CHECK (amount >= 0),
    category TEXT,
    note TEXT,
    session_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS farming_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL CHECK (target_amount > 0),
    deadline TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON transactions(session_id);
"#,
        kind: MigrationKind::Up,
    },
    Migration {
        version: 2,
        description: "normalize_settings_columns",
        sql: r#"
CREATE TABLE settings_new (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    starting_balance REAL NOT NULL DEFAULT 0,
    default_currency TEXT NOT NULL DEFAULT 'aUEC',
    created_at TEXT NOT NULL,
    updated_at TEXT
);

INSERT INTO settings_new (id, starting_balance, default_currency, created_at, updated_at)
SELECT
    id,
    starting_balance,
    COALESCE(currency_label, 'aUEC'),
    COALESCE(updated_at, datetime('now')),
    updated_at
FROM settings;

DROP TABLE settings;
ALTER TABLE settings_new RENAME TO settings;

INSERT OR IGNORE INTO settings (id, starting_balance, default_currency, created_at)
VALUES (1, 0, 'aUEC', datetime('now'));
"#,
        kind: MigrationKind::Up,
    },
    Migration {
        version: 3,
        description: "expand_transactions_table",
        sql: r#"
CREATE TABLE transactions_new (
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

INSERT INTO transactions_new (
    id, type, category, amount, title, description,
    activity_type, ship_used, location, created_at, updated_at
)
SELECT
    id,
    type,
    COALESCE(
        category,
        CASE type
            WHEN 'income' THEN 'Other Income'
            WHEN 'expense' THEN 'Other Expense'
            ELSE 'Other Adjustment'
        END
    ),
    amount,
    COALESCE(NULLIF(TRIM(note), ''), 'Untitled'),
    COALESCE(note, ''),
    '',
    '',
    '',
    created_at,
    created_at
FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
"#,
        kind: MigrationKind::Up,
    },
    Migration {
        version: 4,
        description: "expand_farming_sessions_table",
        sql: r#"
CREATE TABLE farming_sessions_new (
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

INSERT INTO farming_sessions_new (
    id, title, activity_type, ship_used, start_balance, end_balance,
    expenses, net_profit, duration_minutes, location, notes, created_at, updated_at
)
SELECT
    id,
    name,
    'Other',
    '',
    0,
    0,
    0,
    0,
    0,
    '',
    COALESCE(notes, ''),
    started_at,
    COALESCE(ended_at, started_at)
FROM farming_sessions;

DROP TABLE farming_sessions;
ALTER TABLE farming_sessions_new RENAME TO farming_sessions;

CREATE INDEX IF NOT EXISTS idx_farming_sessions_created_at ON farming_sessions(created_at);
"#,
        kind: MigrationKind::Up,
    },
    Migration {
        version: 5,
        description: "expand_goals_table",
        sql: r#"
CREATE TABLE goals_new (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL CHECK (target_amount > 0),
    current_amount_snapshot REAL NOT NULL DEFAULT 0,
    is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
);

INSERT INTO goals_new (
    id, title, target_amount, current_amount_snapshot, is_completed,
    created_at, updated_at, completed_at
)
SELECT
    id,
    title,
    target_amount,
    0,
    CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END,
    created_at,
    COALESCE(completed_at, created_at),
    completed_at
FROM goals;

DROP TABLE goals;
ALTER TABLE goals_new RENAME TO goals;
"#,
        kind: MigrationKind::Up,
    },
    Migration {
        version: 6,
        description: "create_uex_cache",
        sql: r#"
ALTER TABLE settings ADD COLUMN uex_cache_ttl_minutes INTEGER NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS uex_price_snapshots (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"#,
        kind: MigrationKind::Up,
    },
    Migration {
        version: 7,
        description: "expand_settings_uex_and_trading_defaults",
        sql: r#"
ALTER TABLE settings ADD COLUMN uex_api_base TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN uex_api_token TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN uex_use_rust_http INTEGER NOT NULL DEFAULT 0 CHECK (uex_use_rust_http IN (0, 1));
ALTER TABLE settings ADD COLUMN trading_defaults_json TEXT NOT NULL DEFAULT '{}';
"#,
        kind: MigrationKind::Up,
    },
    Migration {
        version: 8,
        description: "create_saved_trade_loops",
        sql: r#"
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
"#,
        kind: MigrationKind::Up,
    }]
}
