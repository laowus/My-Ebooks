use rusqlite::{params, Connection};
use std::fs;
use std::time::SystemTime;
use tauri::{AppHandle, Manager};

const DB_FILENAME: &str = "books.db";

pub fn init_db(app_handle: &AppHandle) -> Result<Connection, rusqlite::Error> {
    // 获取应用数据目录并确保它存在
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");
    fs::create_dir_all(&app_dir).expect("Failed to create app data directory");

    let db_path = app_dir.join(DB_FILENAME);
    let mut db = Connection::open(db_path)?;

    // 设置WAL模式以提高性能
    db.pragma_update(None, "journal_mode", "WAL")?;

    // 直接创建表（如果不存在）
    create_tables(&mut db)?;

    Ok(db)
}

fn create_tables(db: &mut Connection) -> Result<(), rusqlite::Error> {
    db.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS ee_book (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            author TEXT,
            description TEXT,
            toc TEXT,
            isDel INTEGER,
            createTime TEXT,
            updateTime TEXT
        );
        
        CREATE TABLE IF NOT EXISTS ee_chapter (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bookId INTEGER,
            label TEXT,
            href TEXT,
            content TEXT,
            createTime TEXT,
            updateTime TEXT
        );
    ",
    )?;

    Ok(())
}

// 辅助函数：获取当前时间的字符串表示
fn get_current_time_string() -> String {
    // 将系统时间转换为RFC3339格式的字符串
    let now = SystemTime::now();
    now.duration_since(SystemTime::UNIX_EPOCH)
        .map(|dur| dur.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

pub fn add_book(
    db: &mut Connection,
    title: &str,
    author: &str,
    description: &str,
    toc: &str,
) -> Result<i64, rusqlite::Error> {
    // 获取当前时间作为创建和更新时间
    let current_time = get_current_time_string();

    // 执行插入操作
    db.execute(
        "INSERT INTO ee_book (title, author, description, toc, isDel, createTime, updateTime) 
         VALUES (?, ?, ?, ?, 0, ?, ?)",
        params![title, author, description, toc, current_time, current_time],
    )?;

    // 获取插入的行ID
    let book_id = db.last_insert_rowid();

    Ok(book_id)
}


