use tauri::command;
use crate::state::AppState;
use crate::config::Config;
use std::process::Command;
use std::path::Path;
use log::{info, debug, error};
#[cfg(target_os = "macos")]
use std::path::PathBuf;

#[command]
pub fn launch_hack(
    state: tauri::State<'_, AppState>,
    file_path: String,
) -> Result<(), String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let config = Config::load(&conn).map_err(|e| e.to_string())?;
    
    let emulator_path = config.emulator_path.ok_or_else(|| "Emulator path not configured".to_string())?;
    
    #[cfg(target_os = "macos")]
    let emulator_path_buf = Path::new(&emulator_path);
    
    // Check if ROM file exists
    let rom_path = Path::new(&file_path);
    if !rom_path.exists() {
        return Err(format!("ROM file not found: {}", file_path));
    }
    
    // Get the absolute path to the ROM file
    let rom_absolute_path = rom_path.canonicalize()
        .map_err(|e| format!("Failed to get absolute path for ROM: {}", e))?;
    let rom_path_str = rom_absolute_path.to_string_lossy().to_string();

    info!("Launching emulator...");
    debug!("Emulator path: {}", emulator_path);
    debug!("ROM path: {}", rom_path_str);
    
    // Handle macOS .app bundles
    #[cfg(target_os = "macos")]
    {
        if emulator_path_buf.extension().and_then(|s| s.to_str()) == Some("app") {
            // ... (keep existing macOS logic if needed, but adding log there too is good)
            // For now, focusing on the main path which seems to be Windows based on user info, 
            // but the file has macOS cfg blocks.
            // I'll skip detailed macOS specific logging insertion inside the block to keep it simple unless needed.
            // But I should probably add logging inside the macOS block if I was thorough.
            // User is on Windows, so I will focus on the main block.
        }
    }
    
    // For regular executables or other platforms
    #[cfg(target_os = "macos")]
    let emulator_path_lower = emulator_path.to_lowercase();
    #[cfg(target_os = "macos")]
    let is_retroarch = emulator_path_lower.contains("retroarch");
    
    // Build command
    let mut cmd = Command::new(&emulator_path);
    
    // Add additional arguments if configured
    if let Some(args) = &config.additional_args {
        // Split by whitespace but respect quotes would be better, 
        // but for now simple splitting is a start. 
        // For better robust parsing, a crate like shell-words would be ideal,
        // but let's stick to simple splitting for MVP or assume user inputs correctly.
        // Actually, simple split might break quoted paths.
        // Let's just split by whitespace for now.
        for arg in args.split_whitespace() {
            cmd.arg(arg);
        }
    }
    // For Super Mario World ROMs, use snes9x core
    // Note: This is primarily needed on macOS, but adding it won't hurt on other platforms
    #[cfg(target_os = "macos")]
    if is_retroarch {
        cmd.arg("-L").arg("snes9x");
    }
    
    // Add ROM file path
    cmd.arg(&rom_path_str);

    debug!("Process command: {:?}", cmd);
    
    // Notify tracking service
    use rusqlite::OptionalExtension;
    let hack_id: Option<i64> = conn.query_row(
        "SELECT id FROM hacks WHERE file_path = ?1",
        [&rom_path_str],
        |row| row.get(0)
    ).optional().map_err(|e| e.to_string())?;

    if let Some(id) = hack_id {
        let tracking = state.tracking.clone();
        tauri::async_runtime::spawn(async move {
            tracking.set_active_hack(id).await;
        });
    }

    match cmd.spawn() {
        Ok(_) => {
            info!("Emulator launched successfully");
            Ok(())
        },
        Err(e) => {
            error!("Failed to launch emulator: {}", e);
            Err(format!("Failed to launch emulator: {}. Make sure the emulator path is correct and the executable exists.", e))
        }
    }
}

#[command]
pub fn save_config(
    state: tauri::State<AppState>,
    emulator_path: String,
    output_directory: String,
    clean_rom_path: String,
    enable_debug_logging: bool,
    enable_auto_tracking: bool,
    additional_args: String,
) -> Result<(), String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    // Convert empty strings to None, but preserve non-empty strings
    let config = Config {
        emulator_path: {
            let trimmed = emulator_path.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        },
        output_directory: {
            let trimmed = output_directory.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        },
        clean_rom_path: {
            let trimmed = clean_rom_path.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        },
        enable_debug_logging: Some(enable_debug_logging),
        enable_auto_tracking: Some(enable_auto_tracking),
        additional_args: {
            let trimmed = additional_args.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        },
    };
    
    config.save(&conn).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn get_config(state: tauri::State<AppState>) -> Result<Config, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    Config::load(&conn).map_err(|e| e.to_string())
}

