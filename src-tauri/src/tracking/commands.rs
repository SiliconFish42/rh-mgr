use tauri::{State, command};
use crate::state::AppState;
use serde::Serialize;

#[derive(Serialize)]
pub struct TrackingStatus {
    pub connected: bool,
    pub attached: bool,
    pub in_level: bool,
    pub game_mode: u8,
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
    let (connected, attached, in_level, game_mode) = state.tracking.get_status().await;
    Ok(TrackingStatus {
        connected,
        attached,
        in_level,
        game_mode,
    })
}

#[command]
pub async fn get_hack_stats(state: State<'_, AppState>, hack_id: i64) -> Result<HackStats, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    use rusqlite::OptionalExtension;
    
    // Total Play Time
    let total_seconds: Option<i64> = conn.query_row(
        "SELECT SUM(duration_seconds) FROM play_sessions WHERE hack_id = ?1",
        [hack_id],
        |row| row.get(0)
    ).optional().map_err(|e| e.to_string())?.flatten();
    
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
        total_play_time_seconds: total_seconds.unwrap_or(0),
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
    
    Ok(())
}

#[command]
pub async fn clear_all_tracking_data(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM play_sessions", [])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM level_timings", [])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}
