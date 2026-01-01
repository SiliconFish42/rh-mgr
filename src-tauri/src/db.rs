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
                readme TEXT,
                rom_checksum TEXT,
                status TEXT DEFAULT 'not_started',
                total_play_time INTEGER DEFAULT 0
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
    let _ = conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_hacks_api_id ON hacks(api_id)",
        [],
    );
    
    let needs_migration = if let Ok(sql) = conn.query_row::<String, _, _>(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='hacks'",
        [],
        |row| row.get(0),
    ) {
        // Migration needed if the schema is old (missing columns or has strict constraints).
        sql.contains("file_path TEXT NOT NULL") || 
        !sql.contains("authors TEXT") || 
        !sql.contains("difficulty TEXT") || 
        !sql.contains("download_url TEXT") || 
        !sql.contains("readme TEXT") || 
        !sql.contains("rom_checksum TEXT") ||
        !sql.contains("status TEXT") ||
        !sql.contains("total_play_time INTEGER")
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
                    readme TEXT,
                    rom_checksum TEXT,
                    status TEXT DEFAULT 'not_started',
                    total_play_time INTEGER DEFAULT 0
                )",
                [],
            )?;
            
            // Migrate data to new schema.
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
        
        // Execute incremental updates.
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
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN rom_checksum TEXT", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN status TEXT DEFAULT 'not_started'", []);
        let _ = conn.execute("ALTER TABLE hacks ADD COLUMN total_play_time INTEGER DEFAULT 0", []);
        
        // Backfill total_play_time from play_sessions if it's 0
        let _ = conn.execute(
            "UPDATE hacks 
             SET total_play_time = (
                 SELECT COALESCE(SUM(duration_seconds), 0) 
                 FROM play_sessions 
                 WHERE play_sessions.hack_id = hacks.id
             ) 
             WHERE total_play_time = 0", 
            []
        );

        conn.execute("COMMIT", [])?;
    } else {
        // Add missing columns if they don't exist.
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

    conn.execute(
        "CREATE TABLE IF NOT EXISTS play_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hack_id INTEGER NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME,
            duration_seconds INTEGER DEFAULT 0,
            save_slot INTEGER,
            exit_count INTEGER DEFAULT 0,
            FOREIGN KEY (hack_id) REFERENCES hacks(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS level_timings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hack_id INTEGER NOT NULL,
            level_id INTEGER NOT NULL,
            duration_seconds INTEGER DEFAULT 0,
            visit_count INTEGER DEFAULT 0,
            FOREIGN KEY (hack_id) REFERENCES hacks(id) ON DELETE CASCADE,
            UNIQUE(hack_id, level_id)
        )",
        [],
    )?;
    
    Ok(())
}

pub fn set_hack_status(conn: &Connection, hack_id: i64, status: &str) -> Result<()> {
    conn.execute(
        "UPDATE hacks SET status = ?1 WHERE id = ?2",
        [status, &hack_id.to_string()],
    )?;
    Ok(())
}

pub fn update_play_time(conn: &Connection, hack_id: i64, seconds: i64) -> Result<()> {
    conn.execute(
        "UPDATE hacks SET total_play_time = MAX(0, total_play_time + ?1) WHERE id = ?2",
        [seconds.to_string(), hack_id.to_string()],
    )?;
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

    #[test]
    fn test_migration_adds_missing_columns() {
        let conn = Connection::open_in_memory().unwrap();

        // 1. Create a "partial" table (simulate older version without new fields like 'authors')
        conn.execute(
            "CREATE TABLE hacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                file_path TEXT,
                clean_rom_path TEXT,
                api_id TEXT UNIQUE,
                last_played DATETIME
            )",
            [],
        ).unwrap();

        // 2. Run init_db which triggers migration
        init_db(&conn).expect("Database initialization failed");

        // 3. Verify new columns exist
        let mut stmt = conn.prepare("PRAGMA table_info(hacks)").unwrap();
        let rows = stmt.query_map([], |row| {
             let name: String = row.get(1)?;
             Ok(name)
        }).unwrap();

        let columns: Vec<String> = rows.map(|r| r.unwrap()).collect();
        assert!(columns.contains(&"authors".to_string()), "authors column should be added");
        assert!(columns.contains(&"readme".to_string()), "readme column should be added");
        assert!(columns.contains(&"difficulty".to_string()), "difficulty column should be added");
    }

    #[test]
    fn test_migration_from_strict_schema_preserves_data() {
        let conn = Connection::open_in_memory().unwrap();

        // 1. Create table with OLD "strict" schema that forces recreation
        conn.execute(
            "CREATE TABLE hacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                clean_rom_path TEXT,
                api_id TEXT UNIQUE,
                last_played DATETIME
            )",
            [],
        ).unwrap();

        // 2. Insert some data
        conn.execute(
            "INSERT INTO hacks (name, file_path, clean_rom_path, api_id) 
             VALUES (?1, ?2, ?3, ?4)",
            ["Test Hack", "/path/to/rom.smc", "/path/to/clean.smc", "smwc_123"],
        ).unwrap();

        // 3. Run init_db which should trigger the recreation migration path
        init_db(&conn).expect("Database initialization failed");

        // 4. Verify data is preserved
        let name: String = conn.query_row(
            "SELECT name FROM hacks WHERE api_id = ?1",
            ["smwc_123"],
            |row| row.get(0),
        ).expect("Data should be preserved");
        
        assert_eq!(name, "Test Hack");

        // 5. Verify detailed schema changes (e.g. new columns added)
        let mut stmt = conn.prepare("PRAGMA table_info(hacks)").unwrap();
        let rows = stmt.query_map([], |row| {
             let name: String = row.get(1)?;
             Ok(name)
        }).unwrap();
        let columns: Vec<String> = rows.map(|r| r.unwrap()).collect();
        
        assert!(columns.contains(&"readme".to_string()), "New columns should be present after recreation");
        
        // 6. Verify `file_path` is now nullable (by attempting to insert NULL)
        // Note: New schema defines it as `file_path TEXT` which is nullable.
        let result = conn.execute(
            "INSERT INTO hacks (name, file_path) VALUES (?1, NULL)",
            ["Null Path Hack"],
        );
        assert!(result.is_ok(), "Should be able to insert NULL file_path now");
    }


    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_db(&conn).expect("Database initialization failed");
        conn
    }

    #[test]
    fn test_set_hack_status() {
        let conn = setup_db();
        conn.execute("INSERT INTO hacks (name) VALUES ('Test Hack')", []).unwrap();
        let hack_id = conn.last_insert_rowid();

        set_hack_status(&conn, hack_id, "in_progress").expect("Failed to set status");

        let status: String = conn.query_row(
            "SELECT status FROM hacks WHERE id = ?1",
            [hack_id],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(status, "in_progress");
    }

    #[test]
    fn test_update_play_time() {
        let conn = setup_db();
        conn.execute("INSERT INTO hacks (name, total_play_time) VALUES ('Test Hack', 100)", []).unwrap();
        let hack_id = conn.last_insert_rowid();

        // Add time
        update_play_time(&conn, hack_id, 50).expect("Failed to update play time");
        let time: i64 = conn.query_row("SELECT total_play_time FROM hacks WHERE id = ?1", [hack_id], |row| row.get(0)).unwrap();
        assert_eq!(time, 150);

        // Subtract time
        update_play_time(&conn, hack_id, -20).expect("Failed to subtract play time");
        let time: i64 = conn.query_row("SELECT total_play_time FROM hacks WHERE id = ?1", [hack_id], |row| row.get(0)).unwrap();
        assert_eq!(time, 130);

        // Ensure non-negative
        update_play_time(&conn, hack_id, -200).expect("Failed to subtract play time");
        let time: i64 = conn.query_row("SELECT total_play_time FROM hacks WHERE id = ?1", [hack_id], |row| row.get(0)).unwrap();
        assert_eq!(time, 0);
    }
}
