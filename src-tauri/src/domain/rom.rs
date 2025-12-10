use std::path::Path;
use std::fs::File;
use std::io::{Read, Result};

pub struct RomValidator;

impl RomValidator {
    pub fn calculate_md5(path: &Path) -> Result<String> {
        let mut file = File::open(path)?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;
        let digest = md5::compute(buffer);
        Ok(format!("{:x}", digest))
    }

    pub fn is_clean_smw(path: &Path) -> Result<bool> {
        let hash = Self::calculate_md5(path)?;
        // SMW Headerless: cdd3c8c37322978ca8669b34bc89c804
        // SMW Headered: 6b47bb75d16514b6a476aa0c73a683a2 (Not usually considered clean for patching but common)
        // For now just Headerless.
        Ok(hash == "cdd3c8c37322978ca8669b34bc89c804") 
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_calculate_md5() {
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(b"test").unwrap();
        // md5("test") = 098f6bcd4621d373cade4e832627b4f6
        let hash = RomValidator::calculate_md5(file.path()).unwrap();
        assert_eq!(hash, "098f6bcd4621d373cade4e832627b4f6");
    }
}

