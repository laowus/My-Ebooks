use base64::engine::general_purpose;
use base64::engine::Engine as _;
use std::env;
use std::fs;
use std::thread;
use std::time::Duration;
use tauri::{command, AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

#[command]
pub fn read_image(path: String) -> Result<String, String> {
    // 读取图片文件
    let image_data = fs::read(path).map_err(|e| e.to_string())?;
    // 转换为 Base64
    let base64_data = general_purpose::STANDARD.encode(&image_data);
    Ok(base64_data)
}

//删除应用数据目录所有文件
#[command]
pub fn clear_app_data(app_handle: AppHandle) -> Result<(), String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");
    fs::remove_dir_all(app_dir).map_err(|e| e.to_string())?;
    Ok(())
}
// 在文件末尾添加重启应用函数
#[command]
pub async fn restart_app(app_handle: AppHandle) -> Result<(), String> {
    // 获取当前可执行文件路径
    let exe_path = match env::current_exe() {
        Ok(path) => path,
        Err(err) => return Err(format!("获取可执行文件路径失败: {}", err)),
    };

    // 使用ShellExt提供的公开API来启动新进程
    match app_handle.shell().command(exe_path).spawn() {
        Ok(_) => {
            // 延迟一小段时间后关闭当前应用
            thread::spawn(move || {
                thread::sleep(Duration::from_millis(500));
                app_handle.exit(0);
            });
            Ok(())
        }
        Err(err) => Err(format!("启动新应用实例失败: {}", err)),
    }
}

#[command]
pub async fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let command = "open";

    #[cfg(target_os = "windows")]
    let command = "explorer";

    #[cfg(target_os = "linux")]
    let command = "xdg-open";

    std::process::Command::new(command)
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}
