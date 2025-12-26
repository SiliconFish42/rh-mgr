use std::fs;
use std::io::Write;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn get_log_content(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let log_path = app_data_dir.join("rh-mgr.log");
    
    if !log_path.exists() {
        return Ok("No logs found.".to_string());
    }
    
    fs::read_to_string(log_path)
        .map_err(|e| format!("Failed to read log file: {}", e))
}

#[tauri::command]
pub fn clear_log(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let log_path = app_data_dir.join("rh-mgr.log");
    
    if log_path.exists() {
        if let Ok(mut file) = fs::File::create(log_path) {
            let _ = file.write_all(b"");
        }
    }
    
    Ok(())
}
