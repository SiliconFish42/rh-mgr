pub mod db;
pub mod state;
pub mod domain;
pub mod api;
pub mod commands;
pub mod patching;
pub mod config;

use state::AppState;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            commands::onboarding::validate_clean_rom,
            commands::onboarding::has_clean_rom,
            commands::patch::patch_rom, 
            commands::library::get_hacks,
            commands::library::get_hack_details,
            commands::library::get_filter_options,
            commands::launcher::launch_hack,
            commands::launcher::save_config,
            commands::launcher::get_config,
            commands::sync::sync_database,
            commands::sync::add_sample_hacks,
            commands::completions::get_hack_completions,
            commands::completions::create_completion,
            commands::completions::update_completion,
            commands::completions::delete_completion,
            commands::completions::get_completion_summary,
        ])
        .setup(|app| {
            // Get the app data directory and create database there
            let app_data_dir = app.path().app_data_dir()
                .map_err(|e| format!("Failed to get app data directory: {}", e))?;
            
            // Create app data directory if it doesn't exist
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir)
                    .map_err(|e| format!("Failed to create app data directory: {}", e))?;
            }
            
            // Use absolute path for database in app data directory
            let db_path = app_data_dir.join("rh_mgr.db");
            let db_path_str = db_path.to_str()
                .ok_or_else(|| "Failed to convert database path to string".to_string())?;
            
            app.manage(AppState::new(db_path_str));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
