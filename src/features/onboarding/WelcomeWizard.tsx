import { useState } from "react";
import { Button } from "@/components/ui/button";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Upload, ArrowRight } from "lucide-react";

interface WelcomeWizardProps {
  onComplete: () => void;
}

export function WelcomeWizard({ onComplete }: WelcomeWizardProps) {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>("");

  async function selectRom() {
    setLoading(true);
    setStatus("Selecting ROM file...");
    
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: "ROM Files",
          extensions: ["sfc", "smc", "rom"]
        }]
      });

      if (!selected || typeof selected !== "string") {
        setStatus("No file selected");
        setLoading(false);
        return;
      }

      setSelectedPath(selected);
      setStatus("Validating ROM...");
      const isValid = await invoke("validate_clean_rom", { path: selected }) as boolean;

      if (isValid) {
        setStatus("ROM validated and saved! Setting up...");
        setTimeout(() => {
          onComplete();
        }, 1000);
      } else {
        setStatus("Invalid ROM. Please select a clean Super Mario World (US) ROM.");
        setLoading(false);
      }
    } catch (error: any) {
      // The Rust function now returns detailed error messages
      const errorMsg = error?.message || error?.toString() || "Failed to validate ROM";
      setStatus(`Error: ${errorMsg}`);
      setLoading(false);
    }
  }

  async function handleContinue() {
    if (!selectedPath) {
      setStatus("Please select a ROM file first.");
      return;
    }
    await selectRom();
  }

  return (
    <div className="flex h-full">
      {/* Left Content */}
      <div className="flex-1 flex flex-col justify-center px-12">
        <h1 className="text-4xl font-bold mb-6">Welcome to ROM Hack Manager</h1>
        <p className="text-lg text-muted-foreground mb-4">
          The best place to discover, patch, and play Super Mario World hacks.
        </p>
        <p className="text-lg text-muted-foreground">
          To get started, please select your clean, original Super Mario World (USA) ROM file. We'll use this as the base for patching all your hacks.
        </p>
      </div>

      {/* Right Content - Drop Zone */}
      <div className="flex-1 flex flex-col justify-center px-12">
        <div
          className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-card/50"
          onClick={selectRom}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Handle file drop if needed
          }}
        >
          <Upload className="w-16 h-16 mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Drag & Drop your SMW ROM here</p>
          <p className="text-muted-foreground mb-6">or</p>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              selectRom();
            }}
            disabled={loading}
            size="lg"
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            Select Super Mario World ROM
          </Button>
        </div>

        {selectedPath && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Selected: {selectedPath.split(/[/\\]/).pop()}
          </p>
        )}

        {status && (
          <p className={`mt-4 text-sm text-center ${status.includes("Error") || status.includes("Invalid") ? "text-red-400" : "text-muted-foreground"}`}>
            {status}
          </p>
        )}

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={loading || !selectedPath}
          size="lg"
          className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-white"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
