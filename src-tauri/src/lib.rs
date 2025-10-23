mod database;
mod fileutil;
mod setup;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            database::close_database,
            database::add_book,
            database::get_all_books,
            database::add_chapter,
            database::get_chapter,
            database::update_toc,
            database::get_first_chapter,
            database::update_chapter,
            database::delete_book,
            database::update_book,
            fileutil::read_image,
            fileutil::clear_app_data,
            fileutil::restart_app
        ])
        .setup(setup::setup_app)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
