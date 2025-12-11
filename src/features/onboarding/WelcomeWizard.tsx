import { useState } from "react";
import { Button } from "@/components/ui/button";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Upload, ArrowRight, FolderOpen, Gamepad2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeWizardProps {
  onComplete: () => void;
}

type WizardStep = "clean-rom" | "output-dir" | "emulator";

export function WelcomeWizard({ onComplete }: WelcomeWizardProps) {
  const [step, setStep] = useState<WizardStep>("clean-rom");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [cleanRomPath, setCleanRomPath] = useState<string>("");
  const [outputDir, setOutputDir] = useState<string>("");
  const [emulatorPath, setEmulatorPath] = useState<string>("");

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

      setStatus("Validating ROM...");
      const isValid = await invoke("validate_clean_rom", { path: selected }) as boolean;

      if (isValid) {
        setCleanRomPath(selected);
        setStatus("");
        setLoading(false);
      } else {
        setStatus("Invalid ROM. Please select a clean Super Mario World (US) ROM.");
        setLoading(false);
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || "Failed to validate ROM";
      setStatus(`Error: ${errorMsg}`);
      setLoading(false);
    }
  }

  async function selectOutputDir() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        setOutputDir(selected);
      }
    } catch (error) {
      console.error("Failed to select output directory:", error);
    }
  }

  async function selectEmulator() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: "Executable",
          extensions: ["exe", "app", ""]
        }]
      });

      if (selected && typeof selected === "string") {
        setEmulatorPath(selected);
      }
    } catch (error) {
      console.error("Failed to select emulator:", error);
    }
  }

  async function handleFinish() {
    setLoading(true);
    setStatus("Saving configuration...");

    try {
      // 1. Save configuration
      await invoke("save_config", {
        emulatorPath: emulatorPath || "",
        outputDirectory: outputDir || "",
        cleanRomPath: cleanRomPath,
      });

      setStatus("Starting background sync...");

      // 2. Trigger background sync (fire and forget)
      // We don't await this because it might take a while and we want to let the user in
      invoke("sync_database").catch(console.error);

      // 3. Complete onboarding
      onComplete();
    } catch (error: any) {
      console.error("Failed to save config:", error);
      setStatus(`Error saving configuration: ${error}`);
      setLoading(false);
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-12">
      <div className={cn("w-3 h-3 rounded-full transition-colors", step === "clean-rom" ? "bg-yellow-500" : "bg-zinc-700")} />
      <div className={cn("w-3 h-3 rounded-full transition-colors", step === "output-dir" ? "bg-yellow-500" : "bg-zinc-700")} />
      <div className={cn("w-3 h-3 rounded-full transition-colors", step === "emulator" ? "bg-yellow-500" : "bg-zinc-700")} />
    </div>
  );

  const renderCleanRomStep = () => (
    <>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer transition-colors bg-card/50",
          cleanRomPath ? "border-green-500/50 bg-green-500/5" : "border-border hover:border-primary"
        )}
        onClick={selectRom}
      >
        {cleanRomPath ? (
          <CheckCircle2 className="w-16 h-16 mb-4 text-green-500" />
        ) : (
          <Upload className="w-16 h-16 mb-4 text-muted-foreground" />
        )}
        <p className="text-lg font-medium mb-2">
          {cleanRomPath ? "ROM Selected" : "Select Clean SMW ROM"}
        </p>
        <p className="text-muted-foreground text-center text-sm max-w-sm break-all">
          {cleanRomPath || "Drag & Drop or Click to Browse"}
        </p>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={() => setStep("output-dir")}
          disabled={!cleanRomPath || loading}
          size="lg"
          className="bg-yellow-500 hover:bg-yellow-600 text-white"
        >
          Next Step
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </>
  );

  const renderOutputDirStep = () => (
    <>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer transition-colors bg-card/50",
          outputDir ? "border-green-500/50 bg-green-500/5" : "border-border hover:border-primary",
          loading && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
        onClick={loading ? undefined : selectOutputDir}
      >
        <FolderOpen className="w-16 h-16 mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">
          {outputDir ? "Output Directory Selected" : "Select Output Directory"}
        </p>
        <p className="text-muted-foreground text-center text-sm max-w-sm break-all">
          {outputDir || "Where should we save your patched games?"}
        </p>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={() => setStep("clean-rom")} disabled={loading}>
          Back
        </Button>
        <Button
          onClick={() => setStep("emulator")}
          disabled={!outputDir || loading}
          size="lg"
          className="bg-yellow-500 hover:bg-yellow-600 text-white"
        >
          Next Step
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </>
  );

  const renderEmulatorStep = () => (
    <>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer transition-colors bg-card/50",
          emulatorPath ? "border-green-500/50 bg-green-500/5" : "border-border hover:border-primary",
          loading && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
        onClick={loading ? undefined : selectEmulator}
      >
        <Gamepad2 className="w-16 h-16 mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">
          {emulatorPath ? "Emulator Selected" : "Select Emulator (Optional)"}
        </p>
        <p className="text-muted-foreground text-center text-sm max-w-sm break-all">
          {emulatorPath || "Required to play games directly from the app"}
        </p>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={() => setStep("output-dir")} disabled={loading}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={handleFinish}
            disabled={loading}
            variant={emulatorPath ? "default" : "secondary"}
            size="lg"
            className={emulatorPath ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
          >
            {loading ? "Setting up..." : (emulatorPath ? "Finish Setup" : "Skip & Finish")}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-full">
      {/* Left Content */}
      <div className="flex-1 flex flex-col justify-center px-16 bg-zinc-900/50 border-r border-border/50">
        <h1 className="text-4xl font-bold mb-6">
          {step === "clean-rom" && "Welcome to ROM Hack Manager"}
          {step === "output-dir" && "Where should we save games?"}
          {step === "emulator" && "Ready to Play?"}
        </h1>

        <p className="text-lg text-muted-foreground mb-4">
          {step === "clean-rom" && "The best place to discover, patch, and play Super Mario World hacks."}
          {step === "output-dir" && "We need a place to store your patched ROMs. This keeps your clean ROM safe and organized."}
          {step === "emulator" && "Link your preferred SNES emulator to launch games directly from the library."}
        </p>

        <p className="text-lg text-muted-foreground">
          {step === "clean-rom" && "To get started, please select your clean, original Super Mario World (USA) ROM file. We'll use this as the base for patching all your hacks."}
          {step === "output-dir" && "Choose a folder where you have write permissions. We'll create a structured library for you."}
          {step === "emulator" && "This step is optional. You can always configure this later in settings."}
        </p>
      </div>

      {/* Right Content - Interaction Zone */}
      <div className="flex-1 flex flex-col justify-center px-16 relative">
        {renderStepIndicator()}

        {step === "clean-rom" && renderCleanRomStep()}
        {step === "output-dir" && renderOutputDirStep()}
        {step === "emulator" && renderEmulatorStep()}

        {status && (
          <p className={`absolute bottom-8 left-0 right-0 text-center text-sm ${status.includes("Error") || status.includes("Invalid") ? "text-red-400" : "text-muted-foreground"
            }`}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
