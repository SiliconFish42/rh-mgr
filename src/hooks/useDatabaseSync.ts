import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface SyncProgress {
  stage: "fetching" | "processing" | "complete";
  message: string;
  progress: number;
  total: number;
}

const LAST_SYNC_TIME_KEY = "lastSyncTimestamp";

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }
}

export function useDatabaseSync(onSyncComplete?: () => void) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Never synced");
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const lastSyncTimestampRef = useRef<number | null>(null);

  // Load last sync time from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LAST_SYNC_TIME_KEY);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      if (!isNaN(timestamp)) {
        lastSyncTimestampRef.current = timestamp;
        setLastSyncTime(formatRelativeTime(timestamp));
      }
    }
  }, []);

  // Update the displayed time periodically
  useEffect(() => {
    const updateTime = () => {
      if (lastSyncTimestampRef.current !== null) {
        setLastSyncTime(formatRelativeTime(lastSyncTimestampRef.current));
      }
    };

    // Update immediately if we have a timestamp
    if (lastSyncTimestampRef.current !== null) {
      updateTime();
    }

    // Update every minute
    const interval = setInterval(updateTime, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []); // Empty deps - we use ref so we don't need to recreate interval

  function clearProgress() {
    setSyncProgress(null);
  }

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupListener() {
      try {
        unlisten = await listen<SyncProgress>("sync-progress", (event) => {
          setSyncProgress(event.payload);
          
          // If sync is complete, mark as not syncing after a short delay
          if (event.payload.stage === "complete") {
            setTimeout(() => {
              setSyncing(false);
              const timestamp = Date.now();
              lastSyncTimestampRef.current = timestamp;
              localStorage.setItem(LAST_SYNC_TIME_KEY, timestamp.toString());
              setLastSyncTime(formatRelativeTime(timestamp));
              onSyncComplete?.();
              // Clear progress after showing completion message
              setTimeout(() => {
                setSyncProgress(null);
              }, 2000);
            }, 500);
          }
        });
      } catch (error) {
        console.error("Failed to set up sync progress listener:", error);
      }
    }

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [onSyncComplete]);

  async function syncDatabase() {
    setSyncing(true);
    setSyncProgress({
      stage: "fetching",
      message: "Starting sync...",
      progress: 0,
      total: 0,
    });
    try {
      await invoke("sync_database");
    } catch (e: any) {
      console.error("Failed to sync database:", e);
      setSyncing(false);
      setSyncProgress(null);
    }
  }

  return { syncing, lastSyncTime, syncDatabase, syncProgress, clearProgress };
}

