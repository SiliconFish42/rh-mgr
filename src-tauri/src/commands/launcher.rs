use tauri::command;
use crate::state::AppState;
use crate::config::Config;
use std::process::Command;
use std::path::Path;
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
    
    // Handle macOS .app bundles
    #[cfg(target_os = "macos")]
    {
        if emulator_path_buf.extension().and_then(|s| s.to_str()) == Some("app") {
            // Find the executable inside the .app bundle
            // Standard macOS app bundle structure: AppName.app/Contents/MacOS/AppName
            let app_name = emulator_path_buf
                .file_stem()
                .and_then(|s| s.to_str())
                .ok_or_else(|| "Invalid app bundle name".to_string())?;
            
            let mut executable_path = PathBuf::from(&emulator_path);
            executable_path.push("Contents");
            executable_path.push("MacOS");
            executable_path.push(app_name);
            
            // If the standard path doesn't exist, try to find any executable in MacOS directory
            if !executable_path.exists() {
                let macos_dir = executable_path.parent().unwrap();
                if let Ok(entries) = std::fs::read_dir(macos_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            // Check if it's executable (has no extension or is a Unix executable)
                            if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
                                if !name.contains('.') || name.ends_with("retroarch") {
                                    executable_path = path;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            
            if !executable_path.exists() {
                return Err(format!(
                    "Could not find executable in app bundle: {}. Expected at: {}",
                    emulator_path,
                    executable_path.display()
                ));
            }
            
            // Get absolute path to the executable
            let executable_absolute_path = executable_path.canonicalize()
                .map_err(|e| format!("Failed to get absolute path for executable: {}", e))?;
            
            // Check if this is RetroArch (case-insensitive check)
            let is_retroarch = app_name.to_lowercase().contains("retroarch") ||
                executable_absolute_path.to_string_lossy().to_lowercase().contains("retroarch");
            
            // Build command
            let mut cmd = Command::new(&executable_absolute_path);
            
            // RetroArch on macOS requires a core argument to prevent segfault
            // For Super Mario World ROMs, use snes9x core
            if is_retroarch {
                cmd.arg("-L").arg("snes9x");
            }
            
            // Add ROM file path
            cmd.arg(&rom_path_str);
            
            cmd.spawn()
                .map_err(|e| format!("Failed to launch emulator: {}. Make sure the emulator path is correct and the app is installed.", e))?;
            return Ok(());
        }
    }
    
    // For regular executables or other platforms
    let emulator_path_lower = emulator_path.to_lowercase();
    #[cfg(target_os = "macos")]
    let is_retroarch = emulator_path_lower.contains("retroarch");
    
    // Build command
    let mut cmd = Command::new(&emulator_path);
    
    // RetroArch on macOS requires a core argument to prevent segfault
    // For Super Mario World ROMs, use snes9x core
    // Note: This is primarily needed on macOS, but adding it won't hurt on other platforms
    #[cfg(target_os = "macos")]
    if is_retroarch {
        cmd.arg("-L").arg("snes9x");
    }
    
    // Add ROM file path
    cmd.arg(&rom_path_str);
    
    cmd.spawn()
        .map_err(|e| format!("Failed to launch emulator: {}. Make sure the emulator path is correct and the executable exists.", e))?;
    
    Ok(())
}

#[command]
pub fn save_config(
    state: tauri::State<AppState>,
    emulator_path: String,
    output_directory: String,
    clean_rom_path: String,
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
    };
    
    config.save(&conn).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn get_config(state: tauri::State<AppState>) -> Result<Config, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    Config::load(&conn).map_err(|e| e.to_string())
}

