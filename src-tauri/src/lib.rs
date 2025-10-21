mod database;
mod setup;

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
        ])
        .setup(setup::setup_app)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
