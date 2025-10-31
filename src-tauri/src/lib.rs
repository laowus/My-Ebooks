mod database;
mod fileutil;
mod setup;
use tauri::{ Emitter};

#[derive(Clone, serde::Serialize)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            database::close_database,
            database::add_book,
            database::get_all_books,
            database::add_chapter,
            database::get_chapter,
            database::update_toc,
            database::get_chapter_where,
            database::update_chapter,
            database::delete_book,
            database::update_book,
            fileutil::read_image,
            fileutil::clear_app_data,
            fileutil::restart_app,
            fileutil::open_folder,
            fileutil::zip_app_directory,
            fileutil::unzip_file,
        ]);
        
        // #[cfg(desktop)]
        // let builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
        //     println!("{}, {argv:?}, {cwd}", app.package_info().name);
        //     app.emit("single-instance", Payload { args: argv, cwd }).unwrap();
        // }));

        builder.setup(setup::setup_app)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
