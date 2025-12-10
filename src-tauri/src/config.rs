use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    pub emulator_path: Option<String>,
    pub output_directory: Option<String>,
    pub clean_rom_path: Option<String>,
}

impl Config {
    pub fn load(conn: &rusqlite::Connection) -> Result<Self, rusqlite::Error> {
        let mut config = Config {
            emulator_path: None,
            output_directory: None,
            clean_rom_path: None,
        };
        
        let mut stmt = conn.prepare("SELECT key, value FROM config")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        
        for row in rows {
            let (key, value) = row?;
            match key.as_str() {
                "emulator_path" => config.emulator_path = Some(value),
                "output_directory" => config.output_directory = Some(value),
                "clean_rom_path" => config.clean_rom_path = Some(value),
                _ => {}
            }
        }
        
        Ok(config)
    }
    
    pub fn save(&self, conn: &rusqlite::Connection) -> Result<(), rusqlite::Error> {
        // Save or delete emulator_path
        match &self.emulator_path {
            Some(path) => {
                conn.execute(
                    "INSERT OR REPLACE INTO config (key, value) VALUES (?1, ?2)",
                    params!["emulator_path", path],
                )?;
            }
            None => {
                conn.execute("DELETE FROM config WHERE key = ?1", params!["emulator_path"])?;
            }
        }
        
        // Save or delete output_directory
        match &self.output_directory {
            Some(dir) => {
                conn.execute(
                    "INSERT OR REPLACE INTO config (key, value) VALUES (?1, ?2)",
                    params!["output_directory", dir],
                )?;
            }
            None => {
                conn.execute("DELETE FROM config WHERE key = ?1", params!["output_directory"])?;
            }
        }
        
        // Save or delete clean_rom_path
        match &self.clean_rom_path {
            Some(path) => {
                conn.execute(
                    "INSERT OR REPLACE INTO config (key, value) VALUES (?1, ?2)",
                    params!["clean_rom_path", path],
                )?;
            }
            None => {
                conn.execute("DELETE FROM config WHERE key = ?1", params!["clean_rom_path"])?;
            }
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use crate::db::init_db;

    #[test]
    fn test_config_save_and_load() {
        let conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();
        
        let config = Config {
            emulator_path: Some("/usr/bin/emulator".to_string()),
            output_directory: Some("/tmp/output".to_string()),
            clean_rom_path: None,
        };
        
        config.save(&conn).unwrap();
        
        let loaded = Config::load(&conn).unwrap();
        assert_eq!(loaded.emulator_path, config.emulator_path);
        assert_eq!(loaded.output_directory, config.output_directory);
    }
}

