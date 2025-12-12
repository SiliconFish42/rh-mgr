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
            
            // Copy data from old table. We select only the columns guaranteed to exist in the old schema.
            conn.execute(
                "INSERT INTO hacks_new (id, name, file_path, clean_rom_path, api_id, last_played)
                 SELECT id, name, 
                        CASE WHEN file_path = '' THEN NULL ELSE file_path END,
                        clean_rom_path, api_id, last_played 
                 FROM hacks",
                [],
            )?;
            
            // Drop old table and rename new one
             conn.execute("DROP TABLE hacks", [])?;
             conn.execute("ALTER TABLE hacks_new RENAME TO hacks", [])?;
             conn.execute(
                 "CREATE UNIQUE INDEX IF NOT EXISTS idx_hacks_api_id ON hacks(api_id)",
                 [],
             )?;
        }
        
        // Execute incremental updates (safe to run even if table was recreated).
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
        
        conn.execute("COMMIT", [])?;
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
