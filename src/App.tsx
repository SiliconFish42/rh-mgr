import { useState } from "react";
import "./App.css";
import { RootLayout } from "@/layouts/RootLayout";
import { WelcomeWizard } from "@/features/onboarding/WelcomeWizard";
import { LibraryView } from "@/features/library/LibraryView";
import { DiscoverView } from "@/features/discover/DiscoverView";
import { SettingsView } from "@/features/settings/SettingsView";
import { Button } from "@/components/ui/button";
import { useCleanRom } from "@/hooks/useCleanRom";
import { useDatabaseSync } from "@/hooks/useDatabaseSync";
import { SyncProgress } from "@/components/SyncProgress";

type View = "library" | "discover" | "settings";

function App() {
  const [currentView, setCurrentView] = useState<View>("library");
  const { hasCleanRom, checkCleanRom } = useCleanRom();
  const { syncing, lastSyncTime, syncDatabase, syncProgress, clearProgress } = useDatabaseSync();

  async function handleSync() {
    await syncDatabase();
    // Views will reload their filters automatically when needed
  }

  if (hasCleanRom === null) {
    return (
      <RootLayout currentView={currentView} onViewChange={setCurrentView}>
        <div className="flex items-center justify-center h-full">
          <p>Loading...</p>
        </div>
      </RootLayout>
    );
  }

  if (!hasCleanRom) {
    return (
      <RootLayout currentView={currentView} onViewChange={setCurrentView} showSidebar={false}>
        <WelcomeWizard onComplete={() => {
          checkCleanRom();
        }} />
      </RootLayout>
    );
  }

  return (
    <>
      <RootLayout 
        currentView={currentView} 
        onViewChange={setCurrentView}
        syncButton={
          <Button
            onClick={handleSync}
            disabled={syncing}
            size="sm"
          >
            {syncing ? "Syncing..." : "Sync Database"}
          </Button>
        }
        lastSyncTime={lastSyncTime}
      >
        {currentView === "library" && <LibraryView />}
        {currentView === "discover" && <DiscoverView />}
        {currentView === "settings" && <SettingsView />}
      </RootLayout>
      {syncProgress && (
        <SyncProgress
          stage={syncProgress.stage}
          message={syncProgress.message}
          progress={syncProgress.progress}
          total={syncProgress.total}
          onClose={syncProgress.stage === "complete" ? clearProgress : undefined}
        />
      )}
    </>
  );
}

export default App;
