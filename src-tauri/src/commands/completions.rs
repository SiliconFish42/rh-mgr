use tauri::command;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use rusqlite::params;

#[derive(Debug, Serialize, Deserialize)]
pub struct HackCompletion {
    pub id: u32,
    pub hack_id: u32,
    pub route: String,
    pub completed_at: Option<i64>,  // UNIX timestamp in seconds
    pub play_time_seconds: Option<i32>,  // Play time in seconds
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateCompletion {
    pub hack_id: u32,
    pub route: String,
    pub completed_at: Option<i64>,
    pub play_time_seconds: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCompletion {
    pub id: u32,
    pub completed_at: Option<i64>,
    pub play_time_seconds: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletionSummary {
    pub total_completions: u32,
    pub routes: Vec<String>,
}

#[command]
pub fn get_hack_completions(
    state: tauri::State<AppState>,
    hack_id: u32,
) -> Result<Vec<HackCompletion>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, hack_id, route, completed_at, play_time_seconds, created_at, updated_at
         FROM hack_completions WHERE hack_id = ?1 ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    
    let completions = stmt.query_map(
        params![hack_id],
        |row| {
            Ok(HackCompletion {
                id: row.get(0)?,
                hack_id: row.get(1)?,
                route: row.get(2)?,
                completed_at: row.get(3)?,
                play_time_seconds: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        }
    ).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for completion in completions {
        result.push(completion.map_err(|e| e.to_string())?);
    }
    
    Ok(result)
}

#[command]
pub fn create_completion(
    state: tauri::State<AppState>,
    completion: CreateCompletion,
) -> Result<HackCompletion, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;
    
    conn.execute(
        "INSERT INTO hack_completions (hack_id, route, completed_at, play_time_seconds, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            completion.hack_id,
            completion.route,
            completion.completed_at,
            completion.play_time_seconds,
            now,
            now
        ],
    ).map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid() as u32;
    
    let mut stmt = conn.prepare(
        "SELECT id, hack_id, route, completed_at, play_time_seconds, created_at, updated_at
         FROM hack_completions WHERE id = ?1"
    ).map_err(|e| e.to_string())?;
    
    let completion = stmt.query_row(
        params![id],
        |row| {
            Ok(HackCompletion {
                id: row.get(0)?,
                hack_id: row.get(1)?,
                route: row.get(2)?,
                completed_at: row.get(3)?,
                play_time_seconds: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        }
    ).map_err(|e| e.to_string())?;
    
    Ok(completion)
}

#[command]
pub fn update_completion(
    state: tauri::State<AppState>,
    completion: UpdateCompletion,
) -> Result<HackCompletion, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;
    
    conn.execute(
        "UPDATE hack_completions 
         SET completed_at = ?1, play_time_seconds = ?2, updated_at = ?3
         WHERE id = ?4",
        params![
            completion.completed_at,
            completion.play_time_seconds,
            now,
            completion.id
        ],
    ).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, hack_id, route, completed_at, play_time_seconds, created_at, updated_at
         FROM hack_completions WHERE id = ?1"
    ).map_err(|e| e.to_string())?;
    
    let completion = stmt.query_row(
        params![completion.id],
        |row| {
            Ok(HackCompletion {
                id: row.get(0)?,
                hack_id: row.get(1)?,
                route: row.get(2)?,
                completed_at: row.get(3)?,
                play_time_seconds: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        }
    ).map_err(|e| e.to_string())?;
    
    Ok(completion)
}

#[command]
pub fn delete_completion(
    state: tauri::State<AppState>,
    id: u32,
) -> Result<(), String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM hack_completions WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub fn get_completion_summary(
    state: tauri::State<AppState>,
    hack_id: u32,
) -> Result<CompletionSummary, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    let count: u32 = conn.query_row(
        "SELECT COUNT(*) FROM hack_completions WHERE hack_id = ?1",
        params![hack_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT route FROM hack_completions WHERE hack_id = ?1 ORDER BY route"
    ).map_err(|e| e.to_string())?;
    
    let routes = stmt.query_map(
        params![hack_id],
        |row| Ok(row.get::<_, String>(0)?)
    ).map_err(|e| e.to_string())?;
    
    let mut route_vec = Vec::new();
    for route in routes {
        route_vec.push(route.map_err(|e| e.to_string())?);
    }
    
    Ok(CompletionSummary {
        total_completions: count,
        routes: route_vec,
    })
}

