use base64::engine::general_purpose;
use base64::engine::Engine as _;
use std::fs;

mod database;
mod setup;

#[tauri::command]
fn read_image(path: String) -> Result<String, String> {
    // 读取图片文件
    let image_data = fs::read(path).map_err(|e| e.to_string())?;
    // 转换为 Base64
    let base64_data = general_purpose::STANDARD.encode(&image_data);
    Ok(base64_data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            database::add_book,
            database::get_all_books,
            database::add_chapter,
            database::get_chapter,
            database::update_toc,
            database::get_first_chapter,
            database::update_chapter,
            read_image,
        ])
        .setup(setup::setup_app)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
