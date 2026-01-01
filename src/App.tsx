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

type View = "library" | "discover" | "settings";

function App() {
  const [currentView, setCurrentView] = useState<View>("library");
  const { hasCleanRom, checkCleanRom } = useCleanRom();
  const { syncing, lastSyncTime, syncDatabase, syncProgress } = useDatabaseSync();

  async function handleSync() {
    await syncDatabase();
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
        syncProgress={syncProgress}
      >
        {currentView === "library" && <LibraryView />}
        {currentView === "discover" && <DiscoverView />}
        {currentView === "settings" && <SettingsView />}
      </RootLayout>
    </>
  );
}

export default App;
