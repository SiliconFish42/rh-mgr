use tauri::{command, AppHandle, Manager, Emitter};
use crate::patching::Patcher;
use crate::state::AppState;
use crate::config::Config;
use std::path::PathBuf;
use std::fs;
use reqwest;
use rusqlite;

#[command]
pub async fn patch_rom(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    api_id: String,
    download_url: String,
) -> Result<String, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let config = Config::load(&conn).map_err(|e| e.to_string())?;
    
    let clean_rom_path = if let Some(rom_path) = config.clean_rom_path {
        let path = PathBuf::from(&rom_path);
        if !path.exists() {
            return Err(format!("Clean ROM not found at configured path: {}", rom_path));
        }
        path
    } else {
        // Fallback to app data directory
        let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let clean_rom_dir = app_data_dir.join("clean_rom");
        let path = clean_rom_dir.join("smw.sfc");
        if !path.exists() {
            return Err("Clean ROM not found. Please configure your clean ROM path in settings.".to_string());
        }
        path
    };
    
    let output_dir = if let Some(output) = config.output_directory {
        PathBuf::from(&output)
    } else {
        let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        app_data_dir.join("patched")
    };
    
    fs::create_dir_all(&output_dir).map_err(|e| format!("Failed to create output directory: {}", e))?;
    
    let _ = app.emit("patch-progress", serde_json::json!({
        "stage": "downloading",
        "message": "Downloading patch...",
    }));
    
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let temp_dir = app_data_dir.join("temp");
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    
    let client = reqwest::Client::builder()
        .user_agent("RH-MGR/1.0")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let response = client.get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download patch: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to download patch: HTTP {}", response.status()));
    }
    
    
    // Determine extension from Content-Type or URL.
    let content_type = response.headers()
        .get("content-type")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());
    
    let is_zip = download_url.ends_with(".zip") 
        || content_type.as_ref().map(|s| s.contains("zip")).unwrap_or(false);
    
    let downloaded_file = if is_zip {
        temp_dir.join(format!("hack_{}.zip", api_id))
    } else {
        temp_dir.join(format!("hack_{}.bps", api_id))
    };
    
    let mut file = fs::File::create(&downloaded_file)
        .map_err(|e| format!("Failed to create patch file: {}", e))?;
    
    let mut content = std::io::Cursor::new(response.bytes().await
        .map_err(|e| format!("Failed to read patch data: {}", e))?);
    
    std::io::copy(&mut content, &mut file)
        .map_err(|e| format!("Failed to write patch file: {}", e))?;
    
    // Extract if it's a zip
    let _ = app.emit("patch-progress", serde_json::json!({
        "stage": "extracting",
        "message": "Extracting patch...",
    }));
    
    let (extracted_patch, readme_content) = if is_zip {
        Patcher::extract_patch_from_zip(&downloaded_file, &temp_dir)
            .map_err(|e| format!("Failed to extract patch: {}", e))?
    } else {
        (downloaded_file.clone(), None)
    };
    
    // Fallback to API ID if name lookup fails.
    let hack_name = conn.query_row::<String, _, _>(
        "SELECT name FROM hacks WHERE api_id = ?1",
        rusqlite::params![api_id],
        |row| row.get(0),
    ).unwrap_or_else(|_| format!("hack_{}", api_id));
    
    let sanitized_name = hack_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' { c } else { '_' })
        .collect::<String>();
    
    let output_path = output_dir.join(format!("{}.sfc", sanitized_name));
    
    let _ = app.emit("patch-progress", serde_json::json!({
        "stage": "patching",
        "message": "Applying patch...",
    }));
    
    Patcher::patch_bps(&clean_rom_path, &extracted_patch, &output_path)
        .map_err(|e| format!("Failed to apply patch: {}", e))?;
    
    let output_path_str = output_path.to_string_lossy().to_string();
    conn.execute(
        "UPDATE hacks SET file_path = ?1, readme = ?2 WHERE api_id = ?3",
        rusqlite::params![output_path_str, readme_content, api_id],

    ).map_err(|e| format!("Failed to update hack in database: {}", e))?;
    
    if is_zip {
        let _ = fs::remove_file(&extracted_patch);
        let _ = fs::remove_file(&downloaded_file);
    } else {
        let _ = fs::remove_file(&extracted_patch);
    }
    
    let _ = app.emit("patch-progress", serde_json::json!({
        "stage": "complete",
        "message": "Patch applied successfully!",
    }));
    
    Ok(output_path.to_string_lossy().to_string())
}

