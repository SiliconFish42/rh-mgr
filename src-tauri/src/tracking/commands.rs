use tauri::{State, command};
use crate::state::AppState;
use serde::Serialize;

#[derive(Serialize)]
pub struct TrackingStatus {
    pub connected: bool,
    pub attached: bool,
    pub in_level: bool,
    pub game_mode: u8,
    pub manual_hack_id: Option<i64>,
}

#[derive(Serialize)]
pub struct LevelTiming {
    pub level_id: i64,
    pub seconds: i64,
}

#[derive(Serialize)]
pub struct HackStats {
    pub total_play_time_seconds: i64,
    pub session_count: i64,
    pub level_timings: Vec<LevelTiming>,
}

#[command]
pub async fn get_tracking_status(state: State<'_, AppState>) -> Result<TrackingStatus, String> {
    let (connected, attached, in_level, game_mode, manual_hack_id) = state.tracking.get_status().await;
    Ok(TrackingStatus {
        connected,
        attached,
        in_level,
        game_mode,
        manual_hack_id,
    })
}

#[command]
pub async fn start_manual_tracking(state: State<'_, AppState>, hack_id: i64) -> Result<(), String> {
    state.tracking.start_manual_tracking(hack_id).await;
    Ok(())
}

#[command]
pub async fn stop_manual_tracking(state: State<'_, AppState>) -> Result<(), String> {
    state.tracking.stop_manual_tracking().await;
    Ok(())
}

#[command]
pub async fn set_hack_status(state: State<'_, AppState>, hack_id: i64, status: String) -> Result<(), String> {
     let conn = state.db.get().map_err(|e| e.to_string())?;
     crate::db::set_hack_status(&conn, hack_id, &status).map_err(|e| e.to_string())?;
     Ok(())
}

#[command]
pub async fn update_play_time(state: State<'_, AppState>, hack_id: i64, seconds: i64) -> Result<(), String> {
     let conn = state.db.get().map_err(|e| e.to_string())?;
     crate::db::update_play_time(&conn, hack_id, seconds).map_err(|e| e.to_string())?;
     Ok(())
}

#[command]
pub async fn get_hack_stats(state: State<'_, AppState>, hack_id: i64) -> Result<HackStats, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    use rusqlite::OptionalExtension;
    
    // Total Play Time: Prefer reading from hacks table now
    let total_seconds: Option<i64> = conn.query_row(
        "SELECT total_play_time FROM hacks WHERE id = ?1",
        [hack_id],
        |row| row.get(0)
    ).optional().map_err(|e| e.to_string())?.flatten();
    
    // Fallback if null (shouldn't happen with default 0, but safe)
    let total_seconds = total_seconds.unwrap_or(0);
    
    let session_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM play_sessions WHERE hack_id = ?1",
        [hack_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // Level Timings
    let mut stmt = conn.prepare("SELECT level_id, duration_seconds FROM level_timings WHERE hack_id = ?1").map_err(|e| e.to_string())?;
    let level_timings = stmt.query_map([hack_id], |row| {
        Ok(LevelTiming {
            level_id: row.get(0)?,
            seconds: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(HackStats {
        total_play_time_seconds: total_seconds,
        session_count,
        level_timings,
    })
}

#[command]
pub async fn clear_hack_stats(state: State<'_, AppState>, hack_id: i64) -> Result<(), String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM play_sessions WHERE hack_id = ?1", [hack_id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM level_timings WHERE hack_id = ?1", [hack_id])
        .map_err(|e| e.to_string())?;
        
    // Reset total play time in hacks table
    conn.execute("UPDATE hacks SET total_play_time = 0 WHERE id = ?1", [hack_id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub async fn clear_all_tracking_data(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM play_sessions", [])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM level_timings", [])
        .map_err(|e| e.to_string())?;
        
    // Reset total play time for ALL hacks
    conn.execute("UPDATE hacks SET total_play_time = 0", [])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}
