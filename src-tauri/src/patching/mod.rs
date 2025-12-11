use std::path::{Path, PathBuf};
use std::fs;
use flips;

pub struct Patcher;

impl Patcher {
    pub fn patch_bps(clean_rom: &Path, patch: &Path, output: &Path) -> Result<(), String> {
        let clean_data = fs::read(clean_rom).map_err(|e| format!("Failed to read clean ROM: {}", e))?;
        let patch_data = fs::read(patch).map_err(|e| format!("Failed to read patch: {}", e))?;
        
        // Detect patch type by file extension or magic bytes
        let patch_ext = patch.extension()
            .and_then(|s| s.to_str())
            .unwrap_or("");
        
        let patched = if patch_ext == "ips" || patch_data.starts_with(b"PATCH") {
            // IPS patch
            let ips_patch = flips::IpsPatch::new(patch_data);
            let output = ips_patch.apply(clean_data)
                .map_err(|e| format!("Failed to apply IPS patch: {}", e))?;
            output.to_bytes()
        } else {
            // BPS patch (default)
            let bps_patch = flips::BpsPatch::new(patch_data);
            let output = bps_patch.apply(clean_data)
                .map_err(|e| format!("Failed to apply BPS patch: {}", e))?;
            output.to_bytes()
        };
        
        fs::write(output, patched).map_err(|e| format!("Failed to write output: {}", e))?;
        Ok(())
    }

    pub fn extract_patch_from_zip(zip_path: &Path, output_dir: &Path) -> Result<(PathBuf, Option<String>), String> {
        use zip::ZipArchive;
        use std::io::Read;
        
        // Ensure output directory exists
        fs::create_dir_all(output_dir).map_err(|e| format!("Failed to create output directory: {}", e))?;
        
        let file = fs::File::open(zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;
        let mut archive = ZipArchive::new(file).map_err(|e| format!("Failed to read zip: {}", e))?;
        
        // Find the first .bps or .ips file in the archive
        let mut patch_path = None;
        let mut readme_content = None;

        // First pass: look for patch file
        for i in 0..archive.len() {
            let file = archive.by_index(i).map_err(|e| format!("Failed to read zip entry {}: {}", i, e))?;
            let name = file.name();
            if name.ends_with(".bps") || name.ends_with(".ips") {
                patch_path = Some(name.to_string());
                break;
            }
        }
        
        // Second pass: look for readme (txt file)
        // We'll prioritize files with "readme" in the name, otherwise take the first txt file
        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| format!("Failed to read zip entry {}: {}", i, e))?;
            let name = file.name().to_string(); // clone name to avoid borrow issues
            let lower_name = name.to_lowercase();
            
            if lower_name.ends_with(".txt") {
                if lower_name.contains("readme") {
                    let mut content = String::new();
                    // Ignore errors reading non-UTF8 readmes
                    if file.read_to_string(&mut content).is_ok() {
                        readme_content = Some(content);
                        break; // Found the best candidate
                    }
                } else if readme_content.is_none() {
                    let mut content = String::new();
                    if file.read_to_string(&mut content).is_ok() {
                        readme_content = Some(content);
                        // Keep looking for a better match (explicit "readme")
                    }
                }
            }
        }
        
        let patch_name = patch_path.ok_or_else(|| "No .bps or .ips file found in archive".to_string())?;
        
        // Extract the patch file - use just the filename, not the full path from the zip
        let patch_filename = PathBuf::from(&patch_name)
            .file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
            .ok_or_else(|| format!("Invalid patch filename in zip: {}", patch_name))?;
        
        let mut patch_file = archive.by_name(&patch_name).map_err(|e| format!("Failed to extract patch: {}", e))?;
        let output_path = output_dir.join(&patch_filename);
        
        let mut outfile = fs::File::create(&output_path).map_err(|e| format!("Failed to create output file: {}", e))?;
        std::io::copy(&mut patch_file, &mut outfile).map_err(|e| format!("Failed to write patch file: {}", e))?;
        
        Ok((output_path, readme_content))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::io::Write;
    use zip::write::{FileOptions, ZipWriter};
    use std::fs::File;

    #[test]
    fn test_extract_patch_from_zip() {
        let temp_dir = TempDir::new().unwrap();
        let zip_path = temp_dir.path().join("test.zip");
        
        // Create a zip file with a .bps file inside
        let file = File::create(&zip_path).unwrap();
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::<()>::default();
        
        zip.start_file("test.bps", options).unwrap();
        zip.write_all(b"fake bps data").unwrap();
        zip.finish().unwrap();
        
        // Extract it
        let output_dir = temp_dir.path().join("extracted");
        fs::create_dir_all(&output_dir).unwrap();
        
        let result = Patcher::extract_patch_from_zip(&zip_path, &output_dir);
        assert!(result.is_ok());
        
        let extracted_path = result.unwrap();
        assert!(extracted_path.exists());
        assert_eq!(extracted_path.file_name().unwrap(), "test.bps");
    }
}
