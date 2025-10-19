use tauri::State;
mod database;
mod setup;

// 导入 AppState 结构体
use setup::AppState;

#[tauri::command]
fn add_book(
    title: &str,
    author: &str,
    description: &str,
    toc: &str,
    state: State<AppState>,
) -> Result<i64, String> {
    // 从应用状态中获取数据库连接
    let mut db = state.db.lock().map_err(|e| e.to_string())?;

    // 调用database.rs中的add_book函数
    database::add_book(&mut db, title, author, description, toc).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![add_book])
        .setup(setup::setup_app)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
