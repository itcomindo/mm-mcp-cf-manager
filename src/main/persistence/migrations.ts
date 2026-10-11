export const SCHEMA_VERSION = 2

export const MIGRATION_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id TEXT NOT NULL UNIQUE,
    account_id TEXT,
    domain TEXT NOT NULL,
    status TEXT,
    plan_name TEXT,
    capabilities_json TEXT,
    last_synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    source TEXT NOT NULL,
    state TEXT NOT NULL,
    selected_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    summary_json TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS task_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    zone_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT,
    state TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    previous_value_json TEXT,
    requested_value_json TEXT,
    result_json TEXT,
    error_code TEXT,
    error_message TEXT,
    started_at TEXT,
    finished_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );`,
  `CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    previous_value TEXT,
    new_value TEXT,
    status TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'single',
    task_id TEXT,
    error_summary TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_activity_zone_created ON activity(zone_id, created_at DESC);`,
]
