use std::sync::Arc;
use tokio::sync::Mutex;
use crate::tracking::usb2snes::Usb2SnesClient;
use crate::tracking::smw::{SmwAnalyzer, TrackingUpdate};
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use tokio::time::{sleep, Duration};
use chrono::Utc;

#[derive(Clone)]
pub struct TrackingService {
    client: Arc<Mutex<Option<Usb2SnesClient>>>,
    analyzer: Arc<Mutex<SmwAnalyzer>>,
    db_pool: Pool<SqliteConnectionManager>,
    active_hack_id: Arc<Mutex<Option<i64>>>,
    current_session_id: Arc<Mutex<Option<i64>>>,
    last_fingerprint_time: Arc<Mutex<Option<std::time::Instant>>>,
    manual_hack_id: Arc<Mutex<Option<i64>>>,
}

impl TrackingService {
    pub fn new(db_pool: Pool<SqliteConnectionManager>) -> Self {
        Self {
            client: Arc::new(Mutex::new(None)),
            analyzer: Arc::new(Mutex::new(SmwAnalyzer::new())),
            db_pool,
            active_hack_id: Arc::new(Mutex::new(None)),
            current_session_id: Arc::new(Mutex::new(None)),
            last_fingerprint_time: Arc::new(Mutex::new(None)),
            manual_hack_id: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn set_active_hack(&self, hack_id: i64) {
        let mut guard = self.active_hack_id.lock().await;
        *guard = Some(hack_id);
    }
    
    pub async fn clear_active_hack(&self) {
        let mut guard = self.active_hack_id.lock().await;
        *guard = None;
    }

    pub async fn start_manual_tracking(&self, hack_id: i64) {
        let mut manual_guard = self.manual_hack_id.lock().await;
        *manual_guard = Some(hack_id);
    }

    pub async fn stop_manual_tracking(&self) {
        let mut manual_guard = self.manual_hack_id.lock().await;
        *manual_guard = None;
        // Also ensure current session is closed immediately
        let mut sess_guard = self.current_session_id.lock().await;
        *sess_guard = None;
    }

    pub async fn start_background_task(&self) {
        let client_state = self.client.clone();
        let analyzer = self.analyzer.clone();
        let db_pool = self.db_pool.clone();
        let active_hack = self.active_hack_id.clone();
        let session_id = self.current_session_id.clone();
        let last_fingerprint = self.last_fingerprint_time.clone();
        let manual_hack = self.manual_hack_id.clone();

        tokio::spawn(async move {
            let mut rom_block_until: Option<std::time::Instant> = None;
            loop {
                // Check for manual tracking first
                let manual_id = *manual_hack.lock().await;
                
                if let Some(mid) = manual_id {
                    // Manual tracking active
                    // Skip connection logic, just generate an update
                    let mut update: Option<TrackingUpdate> = Some(TrackingUpdate { is_active: true, level_id: None });
                    
                    // We need to ensure active_hack matches manual_id for the session logic to work
                    // Or we just pass manual_id to session logic?
                    // Let's use manual_id as the hack_id for processing
                    
                    // 4. Process Update (Manual)
                    if let Some(up) = update {
                         // Session Logic
                         let mut sess_guard = session_id.lock().await;
                         
                         if up.is_active {
                             if sess_guard.is_none() {
                                 let conn = db_pool.get();
                                 if let Ok(conn) = conn {
                                     let now = Utc::now();
                                     let res = conn.execute(
                                         "INSERT INTO play_sessions (hack_id, start_time) VALUES (?1, ?2)",
                                         (mid, now.to_rfc3339())
                                     );
                                     if let Ok(count) = res {
                                         if count > 0 {
                                            *sess_guard = Some(conn.last_insert_rowid());
                                         }
                                     }
                                 }
                             } else {
                                 if let Some(sid) = *sess_guard {
                                     let conn = db_pool.get();
                                     if let Ok(conn) = conn {
                                         let now = Utc::now();
                                         let _ = conn.execute(
                                             "UPDATE play_sessions SET end_time = ?1, duration_seconds = duration_seconds + 1 WHERE id = ?2",
                                             (now.to_rfc3339(), sid)
                                         );
                                         
                                         let _ = conn.execute(
                                             "UPDATE hacks SET total_play_time = total_play_time + 1 WHERE id = ?1",
                                             [mid]
                                         );
                                     }
                                 }
                             }
                         }
                    }
                    
                    sleep(Duration::from_secs(1)).await;
                    continue; // Skip the rest of the loop
                }

                // 0. Check Config
                let (enable_tracking, debug_logging) = {
                     let conn = db_pool.get();
                     if let Ok(conn) = conn {
                         if let Ok(config) = crate::config::Config::load(&conn) {
                             (config.enable_auto_tracking.unwrap_or(false), config.enable_debug_logging.unwrap_or(false))
                         } else { (false, false) }
                     } else { (false, false) }
                };

                if !enable_tracking {
                    // Ensure disconnected
                     let mut cl_guard = client_state.lock().await;
                     *cl_guard = None;
                     sleep(Duration::from_secs(5)).await;
                     continue;
                }

                // 1. Connection Management
                {
                    let mut cl_guard = client_state.lock().await;
                    
                    if cl_guard.is_none() {
                         // Connect to modern port 23074
                         match Usb2SnesClient::connect("ws://127.0.0.1:23074").await {
                             Ok(mut client) => {
                                 if debug_logging { eprintln!("Tracking: Connected to usb2snes (23074)"); }
                                 let _ = client.register_app("ROM Hack Manager").await;
                                 match client.list_devices().await {
                                     Ok(devices) => {
                                         if let Some(first) = devices.first() {
                                             if debug_logging { eprintln!("Tracking: Attaching to {}", first); }
                                             if let Err(e) = client.attach(first).await {
                                                 if debug_logging { eprintln!("Tracking: Attach failed: {}", e); }
                                             } else {
                                                 // Get device info (flags)
                                                 match client.info().await {
                                                     Ok(info) => {
                                                         eprintln!("Tracking: Full Device Info: {:?}", info);
                                                         // info[2] is usually the ROM name/path
                                                     },
                                                     Err(e) => eprintln!("Tracking: Info failed: {}", e),
                                                 }
                                                 *cl_guard = Some(client);
                                             }
                                         }
                                     }
                                     Err(_e) => {
                                         // eprintln!("Tracking: ListDevices failed: {}", _e);
                                     }
                                 }
                             }
                             Err(_e) => {
                                 // Log periodically/silently?
                                 // eprintln!("Tracking: Connection failed: {}", e);
                             }
                         }
                    }
                }

                // 2. Passive Tracking (Auto-Detection)
                {
                    let mut cl_guard = client_state.lock().await; 
                    if let Some(client) = cl_guard.as_mut() {
                        let mut active_id_guard = active_hack.lock().await;

                        if active_id_guard.is_none() {
                             let mut last_fp = last_fingerprint.lock().await;
                             let should_check = match *last_fp {
                                 Some(t) => t.elapsed() > Duration::from_secs(5),
                                 None => true,
                             };
                             
                             if should_check {
                                 // Check blockade
                                 if let Some(until) = rom_block_until {
                                     if std::time::Instant::now() >= until {
                                         rom_block_until = None;
                                     }
                                 }

                                 if rom_block_until.is_none() {
                                     // Check capabilities
                                     let can_read_rom = !client.flags.iter().any(|f| f == "NO_ROM_READ");
                                     
                                     if can_read_rom {
                                         *last_fp = Some(std::time::Instant::now());
                                         
                                         // Read Title (FFC0, 21 bytes) + Checksum (FFDC, 4 bytes)
                                         match client.read_memory(0x00FFC0, 32).await {
                                     Ok(data) => {
                                          if data.len() >= 32 {
                                              // Checksum at offset 0x1E (FFDE) is 2 bytes checksum
                                              // But typically we used FFDC-FFDF.
                                              // Low byte at 30, High at 31.
                                              
                                              let checksum = ((data[31] as u16) << 8) | (data[30] as u16);
                                              let checksum_hex = format!("{:04X}", checksum);
                                              
                                              let conn = db_pool.get();
                                              if let Ok(conn) = conn {
                                                  // Find by checksum
                                                  let found_id: Result<i64, _> = conn.query_row(
                                                      "SELECT id FROM hacks WHERE rom_checksum = ?1 LIMIT 1",
                                                      [&checksum_hex],
                                                      |row| row.get(0)
                                                  );
                                                  
                                                  if let Ok(id) = found_id {
                                                      eprintln!("Tracking: Auto-detected hack ID: {} (Checksum: {})", id, checksum_hex);
                                                      *active_id_guard = Some(id);
                                                  }
                                              }
                                          }
                                     }
                                     Err(_) => {
                                         // If read fails (likely connection abort on some emulators),
                                         // block passive detection for a while to avoid flapping.
                                         eprintln!("Tracking: ROM Read failed, pausing passive detection for 60s");
                                         rom_block_until = Some(std::time::Instant::now() + Duration::from_secs(60));
                                         *cl_guard = None;
                                     }
                                 }
                                 } else {
                                     // Fallback: Poll Info for ROM Name (RetroArch support)
                                     *last_fp = Some(std::time::Instant::now());
                                     
                                     // client.info() is cheap/text-based
                                     match client.info().await {
                                         Ok(info_vec) => {
                                             if info_vec.len() > 2 {
                                                 let rom_name = &info_vec[2];
                                                  let path = std::path::Path::new(rom_name);
                                                  if let Some(file_name) = path.file_name() {
                                                      if let Some(name_str) = file_name.to_str() {
                                                          if name_str != "No Info" && !name_str.contains("menu.bin") && !name_str.is_empty() {
                                                              let conn = db_pool.get();
                                                              if let Ok(conn) = conn {
                                                                  eprintln!("Tracking: Searching for hack with name/file containing '{}'", name_str);
                                                                  // Try fuzzy match on file_path OR name
                                                                  let found_id: Result<i64, _> = conn.query_row(
                                                                      "SELECT id FROM hacks WHERE file_path LIKE '%' || ?1 || '%' OR name LIKE '%' || ?1 || '%' LIMIT 1",
                                                                      [name_str],
                                                                      |row| row.get(0)
                                                                  );
                                                                  
                                                                  if let Ok(id) = found_id {
                                                                      eprintln!("Tracking: Auto-detected hack ID via Info: {} (Query: {})", id, name_str);
                                                                      *active_id_guard = Some(id);
                                                                  } else {
                                                                      eprintln!("Tracking: No match found for '{}'", name_str);
                                                                  }
                                                              }
                                                          }
                                                      }
                                                  }
                                             }
                                         }
                                         Err(_) => {}
                                     }
                                 }
                             }
                             }
                        }
                    }
                }

                // 3. Poll Memory (Active Tracking)
                let mut update: Option<TrackingUpdate> = None;
                
                {
                    let mut cl_guard = client_state.lock().await;
                    if let Some(client) = cl_guard.as_mut() {
                        // Check if we have an active hack identified
                        let hack_id_opt = *active_hack.lock().await;
                        
                        if hack_id_opt.is_some() {
                             // Try SMW-specific reads first
                             let gamemode = client.read_memory(SmwAnalyzer::ADDR_GAME_MODE, 1).await;
                             let level = client.read_memory(SmwAnalyzer::ADDR_LEVEL_ID, 1).await;
                             let events = client.read_memory(SmwAnalyzer::ADDR_EVENT_FLAGS, SmwAnalyzer::EVENT_FLAGS_SIZE).await;

                             if let (Ok(gm), Ok(lvl), Ok(ev)) = (gamemode, level, events) {
                                  if !gm.is_empty() && !lvl.is_empty() && !ev.is_empty() {
                                       let mut an = analyzer.lock().await;
                                       update = Some(an.interpret(gm[0], lvl[0], &ev));
                                  } else {
                                      // Read returned empty? Likely transient error.
                                      // Fallback to GENERIC active if we are still attached?
                                      // Actually empty read usually means error.
                                       update = Some(TrackingUpdate { is_active: true, level_id: None });
                                  }
                             } else {
                                 // SMW reads failed. 
                                 // This could be because:
                                 // 1. Connection lost (we should check this).
                                 // 2. Not an SMW game (addresses invalid causes error? or just garbage?)
                                 // 3. Device detached.
                                 
                                 // Let's do a "liveness check" to see if we are still connected.
                                 // Read a safe address (Header Title at 0xFFC0)
                                 match client.read_memory(0x00FFC0, 1).await {
                                     Ok(_) => {
                                         // Device is alive, just not SMW or read failed. 
                                         // Assume GENERIC tracking (just time).
                                         update = Some(TrackingUpdate { is_active: true, level_id: None });
                                     },
                                     Err(_) => {
                                         // Connection truly dead.
                                         *cl_guard = None;
                                     }
                                 }
                             }
                        } else {
                            // No active hack, nothing to track yet.
                        }
                    }
                }

                // 4. Process Update
                if let Some(up) = update {
                    let hack_id_opt = *active_hack.lock().await;
                    
                    if let Some(hack_id) = hack_id_opt {
                         // Session Logic
                         let mut sess_guard = session_id.lock().await;
                         
                         if up.is_active {
                             if sess_guard.is_none() {
                                 let conn = db_pool.get();
                                 if let Ok(conn) = conn {
                                     let now = Utc::now();
                                     let res = conn.execute(
                                         "INSERT INTO play_sessions (hack_id, start_time) VALUES (?1, ?2)",
                                         (hack_id, now.to_rfc3339())
                                     );
                                     if let Ok(count) = res {
                                         if count > 0 {
                                            *sess_guard = Some(conn.last_insert_rowid());
                                         }
                                     }
                                 }
                             } else {
                                 if let Some(sid) = *sess_guard {
                                     let conn = db_pool.get();
                                     if let Ok(conn) = conn {
                                         let now = Utc::now();
                                         let _ = conn.execute(
                                             "UPDATE play_sessions SET end_time = ?1, duration_seconds = duration_seconds + 1 WHERE id = ?2",
                                             (now.to_rfc3339(), sid)
                                         );
                                         
                                         // Also update total play time for the hack
                                         let _ = conn.execute(
                                             "UPDATE hacks SET total_play_time = total_play_time + 1 WHERE id = ?1",
                                             [hack_id]
                                         );
                                     }
                                 }
                             }
                             
                             // Level Timing Logic (Only if level_id present)
                             if let Some(lvl) = up.level_id {
                                 let conn = db_pool.get();
                                 if let Ok(conn) = conn {
                                     let _ = conn.execute(
                                         "INSERT INTO level_timings (hack_id, level_id, duration_seconds, visit_count)
                                          VALUES (?1, ?2, 1, 1)
                                          ON CONFLICT(hack_id, level_id) DO UPDATE SET
                                          duration_seconds = duration_seconds + 1", 
                                          (hack_id, lvl)
                                     );
                                 }
                             }
                             
                         }
                    }
                } 

                sleep(Duration::from_secs(1)).await;
            }
        });
    }

    pub async fn get_status(&self) -> (bool, bool, bool, u8, Option<i64>) {
        let client_guard = self.client.lock().await;
        let analyzer = self.analyzer.lock().await;
        let manual_id = *self.manual_hack_id.lock().await;
        
        let connected = client_guard.is_some();
        let attached = connected; // If we have client, we are attached (logic in loop)
        
        (
            connected, 
            attached, 
            analyzer.in_level,
            analyzer.last_game_mode,
            manual_id
        )
    }
}
