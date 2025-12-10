import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useCleanRom() {
  const [hasCleanRom, setHasCleanRom] = useState<boolean | null>(null);

  useEffect(() => {
    checkCleanRom();
  }, []);

  async function checkCleanRom() {
    try {
      const hasRom = await invoke("has_clean_rom") as boolean;
      setHasCleanRom(hasRom);
    } catch (e) {
      console.error("Failed to check clean ROM:", e);
      setHasCleanRom(false);
    }
  }

  return { hasCleanRom, checkCleanRom };
}

