use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;

pub struct AppState {
    pub db: Pool<SqliteConnectionManager>,
}

impl AppState {
    pub fn new(db_path: &str) -> Self {
        let manager = SqliteConnectionManager::file(db_path);
        let pool = Pool::new(manager).expect("Failed to create pool");
        
        // Initialize DB
        let conn = pool.get().expect("Failed to get connection");
        
        // Ensure synchronous writes for data integrity
        conn.execute("PRAGMA synchronous = FULL", [])
            .expect("Failed to set synchronous mode");
        
        crate::db::init_db(&conn).expect("Failed to init DB");

        AppState { db: pool }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_state_initialization() {
        let state = AppState::new(":memory:");
        let conn = state.db.get().unwrap();
        
        // Verify tables exist (integration check)
        let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='hacks'").unwrap();
        let exists = stmt.exists([]).unwrap();
        assert!(exists, "hacks table should exist via AppState init");
    }
}

