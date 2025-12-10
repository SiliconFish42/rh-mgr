use tauri::command;
use tauri::{AppHandle, Emitter};
use crate::state::AppState;
use crate::api::smwc::{SmwcClient, ApiError};
use rusqlite::params;
use serde_json;
use tokio::time::{sleep, Duration};

// Helper to make a request with automatic retry on rate limit
async fn get_hacks_with_retry(
    client: &SmwcClient,
    section: &str,
    page: u32,
) -> Result<crate::api::smwc::RateLimitedResponse<crate::api::smwc::PaginatedResponse>, String> {
    const MAX_RETRIES: u32 = 20; // Allow many retries since we'll wait
    
    for retry_count in 0..=MAX_RETRIES {
        match client.get_hacks(Some(section), Some(page)).await {
            Ok(response) => return Ok(response),
            Err(ApiError::RateLimited { retry_after }) => {
                if retry_count >= MAX_RETRIES {
                    return Err(format!("Rate limit exceeded after {} retries. Please try again later.", MAX_RETRIES));
                }
                
                // Wait for the retry period + a small buffer
                let wait_time = retry_after + 1;
                sleep(Duration::from_secs(wait_time)).await;
                continue;
            }
            Err(ApiError::DecodeError { message, response_body }) => {
                // Decode errors shouldn't be retried - the response structure is wrong
                return Err(format!("{} Response body: {}", message, response_body));
            }
            Err(ApiError::Other(e)) => {
                return Err(format!("API error: {}", e));
            }
        }
    }
    
    Err("Max retries exceeded".to_string())
}

#[command]
pub async fn sync_database(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<u32, String> {
    let client = SmwcClient::new(None);
    let section_name = "smwhacks";
    
    // Emit initial progress
    let _ = app.emit("sync-progress", serde_json::json!({
        "stage": "fetching",
        "message": "Connecting to SMW Central...",
        "progress": 0,
        "total": 0
    }));
    
    // Fetch first page with retry logic
    let _ = app.emit("sync-progress", serde_json::json!({
        "stage": "fetching",
        "message": "Fetching page 1...",
        "progress": 0,
        "total": 0
    }));
    
    let (mut paginated, mut rate_limit_remaining, mut rate_limit_reset) = match get_hacks_with_retry(&client, section_name, 1).await {
        Ok(response) => {
            (response.data, response.rate_limit_remaining, response.rate_limit_reset)
        },
        Err(e) => {
            return Err(format!("Failed to fetch hacks: {}", e));
        }
    };
    
    if paginated.data.is_empty() {
        return Err("No hacks returned from API. The API may be empty or the endpoint may have changed.".to_string());
    }
    
    // Fetch additional pages with rate limiting and automatic retry
    // Fetch all pages, but with rate limit handling
    let max_pages = paginated.last_page;
    
    let _ = app.emit("sync-progress", serde_json::json!({
        "stage": "fetching",
        "message": format!("Found {} pages. Fetching...", max_pages),
        "progress": 1,
        "total": max_pages
    }));
    
    for page in 2..=max_pages {
        // Check rate limit before making request
        if let Some(remaining) = rate_limit_remaining {
            if remaining <= 1 {
                // Wait until rate limit resets
                if let Some(reset_time) = rate_limit_reset {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs();
                    
                    if reset_time > now {
                        let wait_seconds = (reset_time - now) + 1; // Add 1 second buffer
                        sleep(Duration::from_secs(wait_seconds)).await;
                    }
                } else {
                    // No reset time, wait a conservative amount
                    sleep(Duration::from_secs(60)).await;
                }
            }
        }
        
        // Add delay between requests to avoid hitting rate limits
        sleep(Duration::from_secs(2)).await;
        
        let _ = app.emit("sync-progress", serde_json::json!({
            "stage": "fetching",
            "message": format!("Fetching page {}/{}...", page, max_pages),
            "progress": page,
            "total": max_pages
        }));
        
        match get_hacks_with_retry(&client, section_name, page).await {
            Ok(response) => {
                rate_limit_remaining = response.rate_limit_remaining;
                rate_limit_reset = response.rate_limit_reset;
                paginated.data.extend(response.data.data);
                
                // If we're getting low on rate limit, add extra delay
                if let Some(remaining) = rate_limit_remaining {
                    if remaining < 5 {
                        sleep(Duration::from_secs(5)).await;
                    }
                }
            }
            Err(e) => {
                // For non-rate-limit errors, log and continue with what we have
                eprintln!("Failed to fetch page {}: {}", page, e);
                break;
            }
        }
    }
    
    let api_hacks = paginated.data;
    let total_hacks = api_hacks.len();
    
    let _ = app.emit("sync-progress", serde_json::json!({
        "stage": "processing",
        "message": format!("Processing {} hacks...", total_hacks),
        "progress": 0,
        "total": total_hacks
    }));
    
    let conn = state.db.get().map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    let mut synced_count = 0;
    let mut processed = 0;
    
    for api_hack in api_hacks {
        processed += 1;
        
        // Emit progress every 10 hacks or on the last one
        if processed % 10 == 0 || processed == total_hacks {
            let _ = app.emit("sync-progress", serde_json::json!({
                "stage": "processing",
                "message": format!("Processing hack {}/{}...", processed, total_hacks),
                "progress": processed,
                "total": total_hacks
            }));
        }
        let api_id_str = api_hack.id.to_string();
        let hack_name = if api_hack.name.is_empty() {
            format!("Hack {}", api_hack.id)
        } else {
            api_hack.name
        };
        
        // Check if hack already exists
        let exists: bool = match conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM hacks WHERE api_id = ?1)",
            params![api_id_str],
            |row| row.get(0),
        ) {
            Ok(val) => val,
            Err(e) => {
                return Err(format!("Failed to check if hack exists: {}", e));
            }
        };
        
        // Serialize complex fields to JSON
        let authors_json = serde_json::to_string(&api_hack.authors).unwrap_or_else(|_| "[]".to_string());
        let images_json = serde_json::to_string(&api_hack.images.unwrap_or_default()).unwrap_or_else(|_| "[]".to_string());
        let tags_json = serde_json::to_string(&api_hack.tags).unwrap_or_else(|_| "[]".to_string());
        
        // Extract description, difficulty, and type from fields object
        let description = api_hack.fields
            .get("description")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let difficulty = api_hack.fields
            .get("difficulty")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let hack_type = api_hack.fields
            .get("type")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        
        if exists {
            // Update existing hack (update metadata, preserve user data like file_path)
            conn.execute(
                "UPDATE hacks SET name = ?1, authors = ?2, release_date = ?3, description = ?4, 
                 images = ?5, tags = ?6, rating = ?7, downloads = ?8, difficulty = ?9, type = ?10, download_url = ?11 WHERE api_id = ?12",
                params![
                    hack_name.clone(),
                    authors_json,
                    api_hack.time as i64,
                    description,
                    images_json,
                    tags_json,
                    api_hack.rating,
                    api_hack.downloads as i64,
                    difficulty,
                    hack_type,
                    api_hack.download_url,
                    api_id_str
                ],
            ).map_err(|e| format!("Failed to update hack '{}': {}", hack_name, e))?;
        } else {
            // Insert new hack (explicitly set file_path to NULL for synced hacks)
            conn.execute(
                "INSERT INTO hacks (name, api_id, file_path, authors, release_date, description, images, tags, rating, downloads, difficulty, type, download_url) 
                 VALUES (?1, ?2, NULL, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![
                    hack_name.clone(),
                    api_id_str,
                    authors_json,
                    api_hack.time as i64,
                    description,
                    images_json,
                    tags_json,
                    api_hack.rating,
                    api_hack.downloads as i64,
                    difficulty,
                    hack_type,
                    api_hack.download_url
                ],
            ).map_err(|e| format!("Failed to insert hack '{}': {}", hack_name, e))?;
            synced_count += 1;
        }
    }
    
    let _ = app.emit("sync-progress", serde_json::json!({
        "stage": "complete",
        "message": format!("Synced {} new hacks!", synced_count),
        "progress": total_hacks,
        "total": total_hacks
    }));
    
    Ok(synced_count)
}

#[command]
pub fn add_sample_hacks(
    state: tauri::State<AppState>,
) -> Result<u32, String> {
    let conn = state.db.get().map_err(|e| format!("Failed to get database connection: {}", e))?;
    
    let sample_hacks = vec![
        ("Kaizo Mario World", "1"),
        ("Super Mario World: Return to Dinosaur Land", "2"),
        ("Super Dram World", "3"),
        ("Invictus", "4"),
        ("Grand Poo World", "5"),
    ];
    
    let mut added_count = 0;
    
    for (name, api_id) in sample_hacks {
        // Check if hack already exists
        let exists: bool = match conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM hacks WHERE api_id = ?1)",
            params![api_id],
            |row| row.get(0),
        ) {
            Ok(val) => val,
            Err(e) => {
                return Err(format!("Failed to check if hack exists: {}", e));
            }
        };
        
        if !exists {
            conn.execute(
                "INSERT INTO hacks (name, api_id) VALUES (?1, ?2)",
                params![name, api_id],
            ).map_err(|e| format!("Failed to insert hack '{}': {}", name, e))?;
            added_count += 1;
        }
    }
    
    Ok(added_count)
}
