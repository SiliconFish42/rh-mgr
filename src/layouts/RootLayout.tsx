import React from 'react';
import { TrackingStatus } from '../components/TrackingStatus';

interface RootLayoutProps {
  children: React.ReactNode;
  currentView?: "library" | "discover" | "settings";
  onViewChange?: (view: "library" | "discover" | "settings") => void;
  showSidebar?: boolean;
  syncButton?: React.ReactNode;
  lastSyncTime?: string;
}

export function RootLayout({ children, currentView = "library", onViewChange, showSidebar = true, syncButton, lastSyncTime }: RootLayoutProps) {
  // For welcome wizard, don't show sidebar
  if (!showSidebar) {
    return (
      <div className="flex h-screen w-full bg-background text-foreground dark">
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    );
  }

  // For discover/library pages, show top header with tabs
  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground dark">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-6 h-6 bg-foreground rotate-45"></div>
            </div>
            <h1 className="text-xl font-semibold">ROM Hack Manager</h1>
            <nav className="flex gap-1 ml-8">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === "discover"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                onClick={() => onViewChange?.("discover")}
              >
                Discover
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === "library"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                onClick={() => onViewChange?.("library")}
              >
                My Library
              </button>
              <button
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                onClick={() => onViewChange?.("settings")}
              >
                Settings
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <TrackingStatus />
            {syncButton}
            {lastSyncTime && (
              <span className="text-sm text-muted-foreground">Last updated: {lastSyncTime}</span>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
