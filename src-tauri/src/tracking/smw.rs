pub struct SmwAnalyzer {
    pub in_level: bool,
    pub last_game_mode: u8,
    pub current_level_id: Option<u8>,
}

#[derive(Debug, Clone)]
pub struct TrackingUpdate {
    pub is_active: bool,
    pub level_id: Option<u8>,
}

impl SmwAnalyzer {
    pub const ADDR_GAME_MODE: u32 = 0xF50100;
    pub const ADDR_LEVEL_ID: u32 = 0xF513BF;
    pub const ADDR_EVENT_FLAGS: u32 = 0xF51EA2;
    pub const EVENT_FLAGS_SIZE: u32 = 15;
    
    pub fn new() -> Self {
        Self {
            in_level: false,
            last_game_mode: 0,
            current_level_id: None,
        }
    }
    
    pub fn interpret(&mut self, game_mode: u8, level_id: u8, _events: &[u8]) -> TrackingUpdate {
        // Game Modes:
        // 0x0E = Overworld
        // 0x14 = Level
        
        // Excluded level IDs (non-gameplay):
        const EXCLUDED_LEVELS: [u8; 3] = [0x00, 0xC5, 0xC7];
        
        let is_level = game_mode == 0x14;
        let is_overworld = game_mode == 0x0E;
        let is_active = is_level || is_overworld;
        
        let current_level = if is_level && !EXCLUDED_LEVELS.contains(&level_id) { 
            Some(level_id) 
        } else { 
            None 
        };
        
        self.in_level = is_level;
        self.last_game_mode = game_mode;
        self.current_level_id = current_level;

        TrackingUpdate {
            is_active,
            level_id: current_level,
        }
    }
}

