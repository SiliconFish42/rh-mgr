import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";

import { LogViewer } from "@/components/LogViewer";

export function SettingsView() {
  const [emulatorPath, setEmulatorPath] = useState<string>("");
  const [outputDir, setOutputDir] = useState<string>("");
  const [cleanRomPath, setCleanRomPath] = useState<string>("");
  const [additionalArgs, setAdditionalArgs] = useState<string>("");

  const [enableDebugLogging, setEnableDebugLogging] = useState<boolean>(false);
  const [enableAutoTracking, setEnableAutoTracking] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("");

  const emulatorPathRef = useRef<HTMLInputElement>(null);
  const outputDirRef = useRef<HTMLInputElement>(null);
  const cleanRomPathRef = useRef<HTMLInputElement>(null);
  const additionalArgsRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const config = await invoke("get_config") as { emulator_path?: string; output_directory?: string; clean_rom_path?: string; enable_debug_logging?: boolean; enable_auto_tracking?: boolean; additional_args?: string };
      setEmulatorPath(config.emulator_path || "");
      setOutputDir(config.output_directory || "");
      setCleanRomPath(config.clean_rom_path || "");
      setAdditionalArgs(config.additional_args || "");
      setEnableDebugLogging(config.enable_debug_logging || false);
      setEnableAutoTracking(config.enable_auto_tracking || false);
      isInitialLoad.current = false;
    } catch (e) {
      console.error("Failed to load config:", e);
    }
  }

  // Auto-save with debouncing
  useEffect(() => {
    if (isInitialLoad.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after 500ms of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus("Saving...");

        // Read values directly from input fields to avoid state closure issues
        const emulatorPathRaw = emulatorPathRef.current?.value ?? emulatorPath ?? "";
        const outputDirRaw = outputDirRef.current?.value ?? outputDir ?? "";
        const cleanRomPathRaw = cleanRomPathRef.current?.value ?? cleanRomPath ?? "";
        const additionalArgsRaw = additionalArgsRef.current?.value ?? additionalArgs ?? "";

        // Always send as strings (empty string if not set) - Rust will convert empty to None
        const emulatorPathValue = emulatorPathRaw.trim();
        const outputDirValue = outputDirRaw.trim();
        const cleanRomPathValue = cleanRomPathRaw.trim();
        const additionalArgsValue = additionalArgsRaw.trim();

        await invoke("save_config", {
          emulatorPath: emulatorPathValue,
          outputDirectory: outputDirValue,
          cleanRomPath: cleanRomPathValue,
          enableDebugLogging: enableDebugLogging,
          enableAutoTracking: enableAutoTracking,
          additionalArgs: additionalArgsValue,
        });

        setSaveStatus("Saved");
        setTimeout(() => setSaveStatus(""), 2000);
      } catch (e) {
        console.error("Failed to save config:", e);
        setSaveStatus("Error saving");
        setTimeout(() => setSaveStatus(""), 3000);
      }
    }, 500);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [emulatorPath, outputDir, cleanRomPath, enableDebugLogging, enableAutoTracking, additionalArgs]);
  async function selectEmulator() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: "Executable",
          extensions: ["exe", "app", ""]
        }]
      });

      // Handle different return types from Tauri dialog
      let selectedPath: string | null = null;
      if (selected === null) {
        // User cancelled
        return;
      } else if (typeof selected === "string") {
        selectedPath = selected;
      } else if (Array.isArray(selected)) {
        const firstItem = selected[0];
        if (typeof firstItem === "string") {
          selectedPath = firstItem;
        }
      }

      if (selectedPath) {
        setEmulatorPath(selectedPath);
      }
    } catch (e) {
      console.error("Error selecting emulator:", e);
      alert(`Error selecting emulator: ${e}`);
    }
  }

  async function selectOutputDir() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      // Handle different return types from Tauri dialog
      let selectedPath: string | null = null;
      if (selected === null) {
        // User cancelled
        return;
      } else if (typeof selected === "string") {
        selectedPath = selected;
      } else if (Array.isArray(selected)) {
        const firstItem = selected[0];
        if (typeof firstItem === "string") {
          selectedPath = firstItem;
        }
      }

      if (selectedPath) {
        setOutputDir(selectedPath);
      }
    } catch (e) {
      console.error("Error selecting directory:", e);
      alert(`Error selecting directory: ${e}`);
    }
  }

  async function selectCleanRom() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: "ROM Files",
          extensions: ["sfc", "smc", "rom"]
        }]
      });

      // Handle different return types from Tauri dialog
      let selectedPath: string | null = null;
      if (selected === null) {
        // User cancelled
        return;
      } else if (typeof selected === "string") {
        selectedPath = selected;
      } else if (Array.isArray(selected)) {
        const firstItem = selected[0];
        if (typeof firstItem === "string") {
          selectedPath = firstItem;
        }
      }

      if (selectedPath) {
        // Validate the ROM
        try {
          const isValid = await invoke("validate_clean_rom", { path: selectedPath }) as boolean;
          if (isValid) {
            setCleanRomPath(selectedPath);
          } else {
            alert("Invalid ROM. Please select a clean Super Mario World (US) ROM.");
          }
        } catch (e: any) {
          alert(`Failed to validate ROM: ${e?.message || e}`);
        }
      }
    } catch (e) {
      console.error("Error selecting ROM:", e);
      alert(`Error selecting ROM: ${e}`);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Application Settings</h1>
        <p className="text-muted-foreground">Configure essential application settings.</p>
      </div>
      <div className="space-y-8 max-w-3xl">
        {saveStatus && (
          <div className={`text-sm font-medium ${saveStatus === "Saved" ? "text-green-400" : saveStatus === "Saving..." ? "text-blue-400" : "text-red-400"}`}>
            {saveStatus}
          </div>
        )}

        {/* Emulator Configuration */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Emulator Configuration</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Emulator Path</label>
              <div className="flex gap-2">
                <input
                  ref={emulatorPathRef}
                  type="text"
                  value={emulatorPath}
                  onChange={(e) => setEmulatorPath(e.target.value)}
                  className="flex-1 border border-border rounded-md px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="C:\\Emulators\\snes9x\\snes9x.exe"
                />
                <Button onClick={selectEmulator} variant="outline">Browse...</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Path to your SNES emulator executable (e.g., snes9x.exe).
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Additional Arguments</label>
              <div className="flex gap-2">
                <input
                  ref={additionalArgsRef}
                  type="text"
                  value={additionalArgs}
                  onChange={(e) => setAdditionalArgs(e.target.value)}
                  className="flex-1 border border-border rounded-md px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="-L path/to/core.dll"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Optional command line arguments to pass to the emulator (e.g., to load a specific core in RetroArch).
              </p>
            </div>
          </div>
        </div>

        {/* File Paths */}
        <div>
          <h3 className="text-lg font-semibold mb-4">File Paths</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Output Directory</label>
              <div className="flex gap-2">
                <input
                  ref={outputDirRef}
                  type="text"
                  value={outputDir}
                  onChange={(e) => setOutputDir(e.target.value)}
                  className="flex-1 border border-border rounded-md px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="C:\\Users\\Mario\\Documents\\SMW_Hacks\\Patched"
                />
                <Button onClick={selectOutputDir} variant="outline">Browse...</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Folder where patched ROMs will be saved.
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Clean SMW ROM Path</label>
              <div className="flex gap-2">
                <input
                  ref={cleanRomPathRef}
                  type="text"
                  value={cleanRomPath}
                  onChange={(e) => setCleanRomPath(e.target.value)}
                  className="flex-1 border border-border rounded-md px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="C:\\Users\\Mario\\Documents\\SMW_Hacks\\smw.smc"
                />
                <Button onClick={selectCleanRom} variant="outline">Browse...</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Path to your clean, unheadered Super Mario World (U) [!] ROM.
              </p>
            </div>
          </div>
        </div>

        {/* Debug Configuration */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Troubleshooting & Features</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-tracking"
                checked={enableAutoTracking}
                onChange={(e) => setEnableAutoTracking(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="auto-tracking" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable Automatic Playtime Tracking
              </label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Automatically tracks playtime and level progress when connected to a supported emulator (QUsb2snes required).
            </p>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="debug-logging"
                  checked={enableDebugLogging}
                  onChange={(e) => setEnableDebugLogging(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="debug-logging" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Enable Debug Logging
                </label>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowLogs(true)}>
                View Logs
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Writes detailed logs to <code>rh-mgr.log</code> in the app data directory. Useful for troubleshooting launch issues.
              Requires application restart to take full effect.
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <div>
                <p className="text-sm font-medium">Clear All Tracking Data</p>
                <p className="text-xs text-muted-foreground">Deletes all play sessions and level timings for all hacks.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={async () => {
                if (confirm("Are you sure you want to delete all tracking data? This cannot be undone.")) {
                  try {
                    await invoke("clear_all_tracking_data");
                    alert("All tracking data has been cleared.");
                  } catch (e) {
                    alert(`Error: ${e}`);
                  }
                }
              }}>
                Clear All
              </Button>
            </div>
          </div>
        </div>

        <LogViewer isOpen={showLogs} onClose={() => setShowLogs(false)} />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline">Cancel</Button>
          <Button onClick={async () => {
            try {
              setSaveStatus("Saving...");
              await invoke("save_config", {
                emulatorPath: emulatorPathRef.current?.value ?? emulatorPath ?? "",
                outputDirectory: outputDirRef.current?.value ?? outputDir ?? "",
                cleanRomPath: cleanRomPathRef.current?.value ?? cleanRomPath ?? "",
                enableDebugLogging: enableDebugLogging,
                enableAutoTracking: enableAutoTracking,
                additionalArgs: additionalArgsRef.current?.value ?? additionalArgs ?? "",
              });
              setSaveStatus("Saved");
              setTimeout(() => setSaveStatus(""), 2000);
            } catch (e) {
              console.error("Failed to save config:", e);
              setSaveStatus("Error saving");
              setTimeout(() => setSaveStatus(""), 3000);
            }
          }}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}

