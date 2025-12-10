import { invoke } from "@tauri-apps/api/core";

export function useHackActions() {
  async function launchHack(hack: any) {
    if (!hack.file_path) {
      alert("This hack hasn't been patched yet. Please patch it first.");
      return;
    }
    try {
      await invoke("launch_hack", { filePath: hack.file_path });
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || "Unknown error";
      console.error("Failed to launch hack:", error);
      alert(`Failed to launch hack: ${errorMsg}`);
    }
  }

  async function patchHack(hack: any) {
    if (!hack.download_url || !hack.api_id) {
      alert("This hack doesn't have a download URL available.");
      return;
    }
    try {
      await invoke("patch_rom", { 
        apiId: hack.api_id,
        downloadUrl: hack.download_url 
      });
      alert("Patch applied successfully! The hack is now available in your library.");
      window.location.reload();
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || "Unknown error";
      console.error("Failed to patch hack:", error);
      alert(`Failed to patch hack: ${errorMsg}`);
    }
  }

  return { launchHack, patchHack };
}

