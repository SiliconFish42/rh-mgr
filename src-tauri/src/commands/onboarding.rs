use tauri::{command, AppHandle, Manager};
use crate::domain::rom::RomValidator;
use crate::state::AppState;
use crate::config::Config;
use std::path::PathBuf;

#[command]
pub fn validate_clean_rom(
    _app: AppHandle,
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<bool, String> {
    let path_buf = PathBuf::from(&path);
    
    // Check if file exists
    if !path_buf.exists() {
        return Err(format!("File does not exist: {}", path));
    }
    
    // Validate the ROM
    let is_valid = RomValidator::is_clean_smw(&path_buf)
        .map_err(|e| format!("Failed to read or validate ROM file: {}", e))?;
    
    if !is_valid {
        // Calculate hash for debugging
        let file_hash = RomValidator::calculate_md5(&path_buf)
            .map_err(|e| format!("Failed to calculate hash: {}", e))?;
        return Err(format!(
            "Invalid ROM. Expected clean Super Mario World (US) ROM.\n\
            File hash: {}\n\
            Expected hash: cdd3c8c37322978ca8669b34bc89c804\n\
            \n\
            Note: The ROM must be headerless (no SMC header).",
            file_hash
        ));
    }
    
    // Save the ROM path to config instead of copying
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let mut config = Config::load(&conn).unwrap_or_else(|_| Config {
        emulator_path: None,
        output_directory: None,
        clean_rom_path: None,
    });
    
    config.clean_rom_path = Some(path_buf.to_string_lossy().to_string());
    config.save(&conn).map_err(|e| format!("Failed to save ROM path to config: {}", e))?;
    
    Ok(true)
}

#[command]
pub fn has_clean_rom(
    app: AppHandle,
    state: tauri::State<AppState>,
) -> Result<bool, String> {
    // First check if there's a ROM path in config
    let conn = state.db.get().map_err(|e| e.to_string())?;
    if let Ok(config) = Config::load(&conn) {
        if let Some(rom_path) = config.clean_rom_path {
            let path = PathBuf::from(&rom_path);
            if path.exists() {
                return Ok(true);
            }
        }
    }
    
    // Fallback to checking app data directory
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let clean_rom_path = app_data_dir.join("clean_rom").join("smw.sfc");
    Ok(clean_rom_path.exists())
}
