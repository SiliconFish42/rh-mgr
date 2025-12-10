import { invoke } from "@tauri-apps/api/core";
import { useState, useRef } from "react";
import { message } from "@tauri-apps/plugin-dialog";

export function useHackActions() {
  const [isPatching, setIsPatching] = useState(false);
  const isPatchingRef = useRef(false);
  // Generate a random ID to track this hook instance in logs
  const instanceId = useRef(Math.floor(Math.random() * 10000));

  async function launchHack(hack: any) {
    if (!hack.file_path) {
      await message("This hack hasn't been patched yet. Please patch it first.", { title: "Launch Error", kind: "warning" });
      return;
    }
    try {
      await invoke("launch_hack", { filePath: hack.file_path });
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || "Unknown error";
      console.error("Failed to launch hack:", error);
      await message(`Failed to launch hack: ${errorMsg}`, { title: "Launch Error", kind: "error" });
    }
  }

  async function patchHack(hack: any) {
    const logPrefix = `[useHackActions #${instanceId.current}]`;

    if (isPatchingRef.current) {
      console.warn(`${logPrefix} Patch already in progress (LOCKED), ignoring duplicate request`);
      return;
    }

    if (!hack.download_url || !hack.api_id) {
      await message("This hack doesn't have a download URL available.", { title: "Patch Error", kind: "warning" });
      return;
    }

    console.log(`${logPrefix} Starting patch process for:`, hack.name);
    isPatchingRef.current = true;
    setIsPatching(true);

    try {
      await invoke("patch_rom", {
        apiId: hack.api_id,
        downloadUrl: hack.download_url
      });
      console.log(`${logPrefix} Patch successful`);
      await message("Patch applied successfully! The hack is now available in your library.", { title: "Success", kind: "info" });
      window.location.reload();
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || "Unknown error";
      console.error(`${logPrefix} Failed to patch hack:`, error);
      await message(`Failed to patch hack: ${errorMsg}`, { title: "Patch Failed", kind: "error" });
    } finally {
      console.log(`${logPrefix} Patch process finished (finally block)`);
      isPatchingRef.current = false;
      setIsPatching(false);
    }
  }

  async function deleteHack(hackId: number, deleteCompletions: boolean) {
    try {
      await invoke("delete_hack", {
        hackId,
        deleteCompletions
      });
    } catch (error: any) {
      console.error("Failed to delete hack:", error);
      throw error;
    }
  }

  return { launchHack, patchHack, deleteHack, isPatching };
}
