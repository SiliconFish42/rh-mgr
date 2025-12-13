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
}
