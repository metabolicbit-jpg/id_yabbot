-- این جدول اطلاعات کاربران را ذخیره می‌کند
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    first_name TEXT,
    username TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- این جدول برای شمارش کل کاربران استفاده می‌شود
CREATE TABLE IF NOT EXISTS stats (
    key TEXT PRIMARY KEY,
    value INTEGER DEFAULT 0
);