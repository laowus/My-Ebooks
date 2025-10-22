use crate::setup::AppState;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::MutexGuard;
use std::time::SystemTime;
use tauri::{command, AppHandle, Manager, State};

// 定义通用的数据库响应结构体
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DbResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

// 成功响应的辅助构造函数
impl<T: Serialize> DbResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    // 错误响应的辅助构造函数
    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

const DB_FILENAME: &str = "books.db";

pub fn get_db_connection<'a>(
    state: &'a State<'_, AppState>,
) -> Result<MutexGuard<'a, Connection>, String> {
    match state.db.lock() {
        Ok(conn) => Ok(conn),
        Err(err) => Err(err.to_string()),
    }
}

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

// 定义 Book 结构体用于数据传输
#[derive(Debug, Serialize, Deserialize)]
pub struct Book {
    pub id: i64,
    pub title: String,
    pub author: String,
    pub description: String,
    pub toc: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Chapter {
    pub id: i64,
    pub book_id: i64,
    pub label: String,
    pub href: String,
    pub content: String,
}

// 添加书籍
#[command]
pub async fn add_book(
    title: String,
    author: String,
    description: String,
    toc: String,
    state: State<'_, AppState>,
) -> Result<DbResponse<Book>, String> {
    // 从应用状态中获取数据库连接
    let db = get_db_connection(&state)?;

    // 获取当前时间作为创建和更新时间
    let current_time = get_current_time_string();

    // 执行插入操作
    match db.execute(
        "INSERT INTO ee_book (title, author, description, toc, isDel, createTime, updateTime) \
         VALUES (?, ?, ?, ?, 0, ?, ?)",
        params![title, author, description, toc, current_time, current_time],
    ) {
        Ok(_) => {
            // 获取最后插入的 ID
            let last_id = db.last_insert_rowid();

            // 构建成功响应
            let book = Book {
                id: last_id,
                title: title.clone(),
                author: author.clone(),
                description: description.clone(),
                toc: toc.clone(),
            };

            Ok(DbResponse::success(book))
        }
        Err(err) => {
            // 构建错误响应
            Ok(DbResponse::error(err.to_string()))
        }
    }
}

// 获取所有书籍
#[command]
pub fn get_all_books(state: State<'_, AppState>) -> Result<DbResponse<Vec<Book>>, String> {
    let db = get_db_connection(&state)?;
    // 准备查询语句，只获取未删除的书籍(isDel=0)
    let mut stmt = match db.prepare("SELECT * FROM ee_book WHERE isDel = 0") {
        Ok(statement) => statement,
        Err(err) => return Err(err.to_string()),
    };

    // 执行查询并映射结果到Book结构体向量
    let books = match stmt.query_map(params![], |row| {
        Ok(Book {
            id: row.get(0)?,
            title: row.get(1)?,
            author: row.get(2)?,
            description: row.get(3)?,
            toc: row.get(4)?,
        })
    }) {
        Ok(rows) => {
            // 收集查询结果，处理可能的映射错误
            let mut results = Vec::new();
            for book_result in rows {
                match book_result {
                    Ok(book) => results.push(book),
                    Err(err) => return Err(err.to_string()),
                }
            }
            results
        }
        Err(err) => return Err(err.to_string()),
    };

    // 返回成功响应，包含书籍列表
    Ok(DbResponse::success(books))
}

#[command]
pub fn add_chapter(
    book_id: i64,
    label: String,
    href: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<DbResponse<i64>, String> {
    let db = get_db_connection(&state)?;

    // 执行插入操作
    match db.execute(
        "INSERT INTO ee_chapter (bookId, label, href, content) \
         VALUES (?, ?, ?, ?)",
        params![book_id, label, href, content],
    ) {
        Ok(_) => {
            // 获取最后插入的 ID
            let last_id = db.last_insert_rowid();

            Ok(DbResponse::success(last_id))
        }
        Err(err) => {
            // 构建错误响应
            Ok(DbResponse::error(err.to_string()))
        }
    }
}

#[command]
pub fn get_chapter(
    book_id: i64,
    id: String,
    state: State<'_, AppState>,
) -> Result<DbResponse<Vec<Chapter>>, String> {
    let db = get_db_connection(&state)?;

    // 执行查询操作
    let mut stmt = match db.prepare("SELECT * FROM ee_chapter WHERE bookId = ? AND id = ?") {
        Ok(statement) => statement,
        Err(err) => return Err(err.to_string()),
    };

    // 执行查询并映射结果到Chapter结构体向量
    let chapters = match stmt.query_map(params![book_id, id], |row| {
        Ok(Chapter {
            id: row.get(0)?,
            book_id: row.get(1)?,
            label: row.get(2)?,
            href: row.get(3)?,
            content: row.get(4)?,
        })
    }) {
        Ok(rows) => {
            // 收集查询结果，处理可能的映射错误
            let mut results = Vec::new();
            for chapter_result in rows {
                match chapter_result {
                    Ok(chapter) => results.push(chapter),
                    Err(err) => return Err(err.to_string()),
                }
            }
            results
        }
        Err(err) => return Err(err.to_string()),
    };

    // 返回成功响应，包含章节列表
    Ok(DbResponse::success(chapters))
}

#[command]
pub fn update_toc(
    id: i64,
    toc: String,
    state: State<'_, AppState>,
) -> Result<DbResponse<i64>, String> {
    let db = get_db_connection(&state)?;

    // 执行更新操作
    match db.execute("UPDATE ee_book SET toc = ? WHERE id = ?", params![toc, id]) {
        Ok(_) => {
            // 返回成功响应，包含更新的行数
            Ok(DbResponse::success(1))
        }
        Err(err) => {
            // 构建错误响应
            Ok(DbResponse::error(err.to_string()))
        }
    }
}

// 获取书籍的第一章节
#[command]
pub fn get_first_chapter(
    book_id: i64,
    state: State<'_, AppState>,
) -> Result<DbResponse<Vec<Chapter>>, String> {
    let db = get_db_connection(&state)?;
    // 执行查询操作
    let mut stmt =
        match db.prepare("SELECT * FROM ee_chapter WHERE bookId = ? ORDER BY id ASC LIMIT 1") {
            Ok(statement) => statement,
            Err(err) => return Err(err.to_string()),
        };
    // 执行查询并映射结果到Chapter结构体
    let chapter = match stmt.query_map(params![book_id], |row| {
        Ok(Chapter {
            id: row.get(0)?,
            book_id: row.get(1)?,
            label: row.get(2)?,
            href: row.get(3)?,
            content: row.get(4)?,
        })
    }) {
        Ok(rows) => {
            // 收集查询结果，处理可能的映射错误
            let mut results = Vec::new();
            for chapter_result in rows {
                match chapter_result {
                    Ok(chapter) => results.push(chapter),
                    Err(err) => return Err(err.to_string()),
                }
            }
            results
        }
        Err(err) => return Err(err.to_string()),
    };
    // 返回成功响应，包含章节列表
    Ok(DbResponse::success(chapter))
}

#[command]
pub fn update_chapter(
    id: i64,
    label: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<DbResponse<i64>, String> {
    let db = get_db_connection(&state)?;

    // 执行更新操作
    match db.execute(
        "UPDATE ee_chapter SET content = ?, label = ?, updateTime = datetime('now', 'localtime') WHERE id = ?",
        params![content, label, id],
    ) {
        Ok(_) => {
            // 返回成功响应，包含更新的行数
            Ok(DbResponse::success(1))
        },
        Err(err) => {
            // 构建错误响应
            Ok(DbResponse::error(err.to_string()))
        }
    }
}
