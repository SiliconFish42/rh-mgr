use tauri::command;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use rusqlite::params;

#[derive(Debug, Serialize, Deserialize)]
pub struct Hack {
    pub id: u32,
    pub name: String,
    pub file_path: Option<String>,
    pub api_id: Option<String>,
    pub authors: Option<String>, // JSON array
    pub release_date: Option<i64>, // UNIX timestamp
    pub description: Option<String>,
    pub images: Option<String>, // JSON array
    pub tags: Option<String>, // JSON array
    pub rating: Option<f64>,
    pub downloads: Option<i64>,
    pub difficulty: Option<String>,
    pub hack_type: Option<String>, // Using hack_type to avoid Rust keyword conflict
    pub download_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct HackFilters {
    pub patched_only: Option<bool>,
    pub unpatched_only: Option<bool>,
    pub sort_by: Option<String>, // "name", "date", "rating", "downloads"
    pub sort_direction: Option<String>, // "asc", "desc"
    pub difficulty: Option<String>,
    pub difficulties: Option<Vec<String>>, // Array of difficulties for OR filtering
    pub hack_type: Option<String>, // Deprecated: use hack_types instead
    pub hack_types: Option<Vec<String>>,
    pub author: Option<String>,
    pub min_rating: Option<f64>,
}

#[command]
pub fn get_hacks(
    state: tauri::State<AppState>,
    limit: Option<u32>,
    offset: Option<u32>,
    filters: Option<HackFilters>,
) -> Result<Vec<Hack>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    
    let filters = filters.unwrap_or_default();
    
    // Build WHERE clause
    let mut where_clauses: Vec<String> = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if filters.patched_only.unwrap_or(false) {
        where_clauses.push("file_path IS NOT NULL".to_string());
    }
    if filters.unpatched_only.unwrap_or(false) {
        where_clauses.push("file_path IS NULL".to_string());
    }
    
    // Handle multiple difficulties with OR logic (hack can match ANY of the selected)
    if let Some(difficulties) = &filters.difficulties {
        if !difficulties.is_empty() {
            let mut diff_conditions = Vec::new();
            for difficulty in difficulties {
                diff_conditions.push("difficulty = ?");
                params_vec.push(Box::new(difficulty.clone()));
            }
            where_clauses.push(format!("({})", diff_conditions.join(" OR ")));
        }
    } else if let Some(difficulty) = &filters.difficulty {
        // Fallback for single difficulty
        where_clauses.push("difficulty = ?".to_string());
        params_vec.push(Box::new(difficulty.clone()));
    }

    // Handle multiple hack types with AND logic (all selected types must be present)
    if let Some(hack_types) = &filters.hack_types {
        if !hack_types.is_empty() {
            // For each type, we need to check that it appears in the comma-separated type field
            // We'll use AND logic: all selected types must be present
            let mut type_conditions = Vec::new();
            for hack_type in hack_types {
                // Check for exact match, or if it appears as a complete type in a comma-separated list
                type_conditions.push("(type = ? OR type LIKE ? OR type LIKE ? OR type LIKE ?)");
                let exact_match = hack_type.clone();
                let starts_with = format!("{}, %", hack_type);  // "Type, ..."
                let contains = format!("%, {}, %", hack_type);  // "..., Type, ..."
                let ends_with = format!("%, {}", hack_type);    // "..., Type"
                params_vec.push(Box::new(exact_match));
                params_vec.push(Box::new(starts_with));
                params_vec.push(Box::new(contains));
                params_vec.push(Box::new(ends_with));
            }
            // Join all type conditions with AND to ensure all selected types are present
            where_clauses.push(format!("({})", type_conditions.join(" AND ")));
        }
    } else if let Some(hack_type) = &filters.hack_type {
        // Legacy support for single hack_type (backward compatibility)
        // Match if the type field contains the filter value (handles comma-separated types)
        // Check for exact match, or if it appears as a complete type in a comma-separated list
        where_clauses.push("(type = ? OR type LIKE ? OR type LIKE ? OR type LIKE ?)".to_string());
        let exact_match = hack_type.clone();
        let starts_with = format!("{}, %", hack_type);  // "Type, ..."
        let contains = format!("%, {}, %", hack_type);  // "..., Type, ..."
        let ends_with = format!("%, {}", hack_type);    // "..., Type"
        params_vec.push(Box::new(exact_match));
        params_vec.push(Box::new(starts_with));
        params_vec.push(Box::new(contains));
        params_vec.push(Box::new(ends_with));
    }
    if let Some(author) = &filters.author {
        where_clauses.push("authors LIKE ?".to_string());
        params_vec.push(Box::new(format!("%\"name\":\"{}\"%", author)));
    }
    if let Some(min_rating) = filters.min_rating {
        where_clauses.push("rating >= ?".to_string());
        params_vec.push(Box::new(min_rating));
    }
    
    let where_clause = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };
    
    // Build ORDER BY clause
    let sort_by = filters.sort_by.as_deref().unwrap_or("name");
    let sort_direction = filters.sort_direction.as_deref().unwrap_or("asc");
    let order_by = match sort_by {
        "date" => format!("ORDER BY release_date {}", sort_direction),
        "rating" => format!("ORDER BY rating {} NULLS LAST", sort_direction),
        "downloads" => format!("ORDER BY downloads {} NULLS LAST", sort_direction),
        _ => format!("ORDER BY name {}", sort_direction),
    };
    
    let query = format!(
        "SELECT id, name, file_path, api_id, authors, release_date, description, images, tags, rating, downloads, difficulty, type, download_url 
         FROM hacks {} {} LIMIT ? OFFSET ?",
        where_clause, order_by
    );
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    // Add limit and offset to params
    params_vec.push(Box::new(limit));
    params_vec.push(Box::new(offset));
    
    let hacks = stmt.query_map(
        params_vec.iter().map(|p| p.as_ref()).collect::<Vec<_>>().as_slice(),
        |row| {
            Ok(Hack {
                id: row.get(0)?,
                name: row.get(1)?,
                file_path: row.get(2)?,
                api_id: row.get(3)?,
                authors: row.get(4)?,
                release_date: row.get(5)?,
                description: row.get(6)?,
                images: row.get(7)?,
                tags: row.get(8)?,
                rating: row.get(9)?,
                downloads: row.get(10)?,
                difficulty: row.get(11)?,
                hack_type: row.get(12)?,
                download_url: row.get(13)?,
            })
        }
    ).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for hack in hacks {
        result.push(hack.map_err(|e| e.to_string())?);
    }
    
    Ok(result)
}

#[command]
pub fn get_hack_details(
    state: tauri::State<AppState>,
    hack_id: u32,
) -> Result<Option<Hack>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, name, file_path, api_id, authors, release_date, description, images, tags, rating, downloads, difficulty, type, download_url 
         FROM hacks WHERE id = ?1"
    ).map_err(|e| e.to_string())?;
    
    let mut rows = stmt.query_map(params![hack_id], |row| {
        Ok(Hack {
            id: row.get(0)?,
            name: row.get(1)?,
            file_path: row.get(2)?,
            api_id: row.get(3)?,
            authors: row.get(4)?,
            release_date: row.get(5)?,
            description: row.get(6)?,
            images: row.get(7)?,
            tags: row.get(8)?,
            rating: row.get(9)?,
            downloads: row.get(10)?,
            difficulty: row.get(11)?,
            hack_type: row.get(12)?,
            download_url: row.get(13)?,
        })
    }).map_err(|e| e.to_string())?;
    
    Ok(rows.next().transpose().map_err(|e| e.to_string())?)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FilterOptions {
    pub difficulties: Vec<String>,
    pub hack_types: Vec<String>,
}

#[command]
pub fn get_filter_options(
    state: tauri::State<AppState>,
) -> Result<FilterOptions, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    // Get unique difficulties
    let mut difficulties = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT DISTINCT difficulty FROM hacks WHERE difficulty IS NOT NULL AND difficulty != '' ORDER BY difficulty"
    ).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(row.get::<_, String>(0)?)
    }).map_err(|e| e.to_string())?;
    
    for row in rows {
        difficulties.push(row.map_err(|e| e.to_string())?);
    }
    
    // Get unique hack types by parsing comma-separated values
    let mut hack_types_set = std::collections::HashSet::new();
    let mut stmt = conn.prepare(
        "SELECT type FROM hacks WHERE type IS NOT NULL AND type != ''"
    ).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(row.get::<_, String>(0)?)
    }).map_err(|e| e.to_string())?;
    
    for row in rows {
        let type_str = row.map_err(|e| e.to_string())?;
        // Split by comma and extract individual types
        for individual_type in type_str.split(',') {
            let trimmed = individual_type.trim();
            if !trimmed.is_empty() {
                hack_types_set.insert(trimmed.to_string());
            }
        }
    }
    
    // Convert HashSet to sorted Vec
    let mut hack_types: Vec<String> = hack_types_set.into_iter().collect();
    hack_types.sort();
    
    Ok(FilterOptions {
        difficulties,
        hack_types,
    })
}

impl Default for HackFilters {
    fn default() -> Self {
        Self {
            patched_only: None,
            unpatched_only: None,
            sort_by: None,
            sort_direction: None,
            difficulty: None,
            difficulties: None,
            hack_type: None,
            hack_types: None,
            author: None,
            min_rating: None,
        }
    }
}

#[command]
pub fn delete_hack(
    state: tauri::State<AppState>,
    hack_id: u32,
    delete_completions: bool,
) -> Result<(), String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    
    // 1. Get file path
    let file_path: Option<String> = conn.query_row(
        "SELECT file_path FROM hacks WHERE id = ?1",
        params![hack_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    // 2. Delete file if exists
    if let Some(path) = file_path {
        let path = std::path::Path::new(&path);
        if path.exists() {
            std::fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    
    // 3. Delete completions if requested
    if delete_completions {
        conn.execute(
            "DELETE FROM hack_completions WHERE hack_id = ?1",
            params![hack_id],
        ).map_err(|e| e.to_string())?;
    }
    
    // 4. Update hack record (remove file_path instead of deleting record)
    conn.execute(
        "UPDATE hacks SET file_path = NULL WHERE id = ?1",
        params![hack_id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
