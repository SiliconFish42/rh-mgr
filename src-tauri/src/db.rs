use rusqlite::{Connection, Result};

pub fn init_db(conn: &Connection) -> Result<()> {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS hacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                file_path TEXT,
                clean_rom_path TEXT,
                api_id TEXT UNIQUE,
                last_played DATETIME,
                authors TEXT,
                release_date INTEGER,
                description TEXT,
                images TEXT,
                tags TEXT,
                rating REAL,
                downloads INTEGER,
                difficulty TEXT,
                type TEXT,
                download_url TEXT,
                readme TEXT
            )",
            [],
        )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS hack_completions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hack_id INTEGER NOT NULL,
            route TEXT NOT NULL,
            completed_at INTEGER,
            play_time_seconds INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (hack_id) REFERENCES hacks(id) ON DELETE CASCADE,
            UNIQUE(hack_id, route)
        )",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_hack_completions_hack_id ON hack_completions(hack_id)",
        [],
    )?;

    // Migrations for existing databases
    migrate_db(conn)?;

    Ok(())
}

fn migrate_db(conn: &Connection) -> Result<()> {
    // Add UNIQUE constraint to api_id if it doesn't exist
    let _ = conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_hacks_api_id ON hacks(api_id)",
        [],
    );
    
    // Check if we need to migrate the schema
    let needs_migration = if let Ok(sql) = conn.query_row::<String, _, _>(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='hacks'",
        [],
        |row| row.get(0),
    ) {
        // Check if old schema (missing new columns or has NOT NULL constraint)
        sql.contains("file_path TEXT NOT NULL") || !sql.contains("authors TEXT") || !sql.contains("difficulty TEXT") || !sql.contains("download_url TEXT") || !sql.contains("readme TEXT")
    } else {
        false
    };
    
    if needs_migration {
        // Recreate table with all columns
        conn.execute("BEGIN TRANSACTION", [])?;
        
        // Create new table with correct schema
        conn.execute(
            "CREATE TABLE hacks_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                file_path TEXT,
                clean_rom_path TEXT,
                api_id TEXT UNIQUE,
                last_played DATETIME,
                authors TEXT,
                release_date INTEGER,
                description TEXT,
                images TEXT,
                tags TEXT,
                rating REAL,
                downloads INTEGER,
                difficulty TEXT,
                type TEXT,
                download_url TEXT,
                readme TEXT
            )",
            [],
        )?;
        
        // Copy data from old table
        // Handle potentially missing columns in source table by checking pragma_table_info or just try/catch wrappers usually
        // But since we control the schema evolution, we can be smart.
        // Simplest safe way in sqlite for potentially missing source columns is to list common ones.
        // Since we are upgrading, we can just grab what we know exists.
        // However, standard SQL doesn't easily "select if exists".
        // RUSQLITE doesn't make dynamic migration queries easy without reflection.
        // Given the simplistic nature here, we can rely on the fact that if we are here, we might be missing columns.
        
        // Actually, the safest incremental migration is typically ALTER TABLE ADD COLUMN.
        // The reconstruction is only strictly needed for removing NOT NULL or changing types.
        // If we only ever ADD columns (which we are mostly doing now), we can stick to the ALTER TABLE approach for new fields
        // and only do the heavy lift for the file_path change if it wasn't done yet.
        
        // Let's refine the strategy:
        // The "needs_migration" check for file_path TEXT NOT NULL is the only one needing table recreation.
        // If that's NOT the case, we can just use ALTER TABLE for everything else.
        
        let should_recreate = if let Ok(sql) = conn.query_row::<String, _, _>(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='hacks'",
            [],
            |row| row.get(0),
        ) {
            sql.contains("file_path TEXT NOT NULL")
        } else {
            false
        };

        if should_recreate {
             // Create new table with correct schema including readme
            conn.execute(
                "CREATE TABLE hacks_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    file_path TEXT,
                    clean_rom_path TEXT,
                    api_id TEXT UNIQUE,
                    last_played DATETIME,
                    authors TEXT,
                    release_date INTEGER,
                    description TEXT,
                    images TEXT,
                    tags TEXT,
                    rating REAL,
                    downloads INTEGER,
                    difficulty TEXT,
                    type TEXT,
                    download_url TEXT,
                    readme TEXT
                )",
                [],
            )?;
            
            // This copy might fail if source lacks columns.
            // But if we are in the "recreate" branch, it means we are coming from the VERY OLD schema
            // which likely only had basic fields.
            // We should select only the guaranteed fields from the old schema.
            conn.execute(
                "INSERT INTO hacks_new (id, name, file_path, clean_rom_path, api_id, last_played)
                 SELECT id, name, 
                        CASE WHEN file_path = '' THEN NULL ELSE file_path END,
                        clean_rom_path, api_id, last_played 
                 FROM hacks",
                [],
            )?;
            
            conn.execute("DROP TABLE hacks", [])?;
            conn.execute("ALTER TABLE hacks_new RENAME TO hacks", [])?;
            conn.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_hacks_api_id ON hacks(api_id)",
                [],
            )?;
        }
        
        // Apply incremental updates for everything else (idempotent)
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN authors TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN release_date INTEGER", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN description TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN images TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN tags TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN rating REAL", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN downloads INTEGER", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN difficulty TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN type TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN download_url TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN readme TEXT", []);
        
        if should_recreate {
            conn.execute("COMMIT", [])?;
        }
    } else {
        // Just add missing columns if they don't exist (for incremental updates)
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN authors TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN release_date INTEGER", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN description TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN images TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN tags TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN rating REAL", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN downloads INTEGER", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN difficulty TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN type TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN download_url TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN readme TEXT", []);
    }
    
    // Ensure hack_completions table exists (for existing databases)
    let _ = conn.execute(
        "CREATE TABLE IF NOT EXISTS hack_completions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hack_id INTEGER NOT NULL,
            route TEXT NOT NULL,
            completed_at INTEGER,
            play_time_seconds INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (hack_id) REFERENCES hacks(id) ON DELETE CASCADE,
            UNIQUE(hack_id, route)
        )",
        [],
    );
    
    let _ = conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_hack_completions_hack_id ON hack_completions(hack_id)",
        [],
    );
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_init_db_creates_tables() {
        let conn = Connection::open_in_memory().unwrap();
        init_db(&conn).expect("Database initialization failed");

        // Check hacks table
        let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='hacks'").unwrap();
        let exists = stmt.exists([]).unwrap();
        assert!(exists, "hacks table should exist");

        // Check config table
        let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='config'").unwrap();
        let exists = stmt.exists([]).unwrap();
        assert!(exists, "config table should exist");
    }
}
