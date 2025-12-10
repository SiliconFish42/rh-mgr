interface SyncProgressProps {
  stage: "fetching" | "processing" | "complete";
  message: string;
  progress: number;
  total: number;
  onClose?: () => void;
}

export function SyncProgress({ stage, message, progress, total, onClose }: SyncProgressProps) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;
  const isComplete = stage === "complete";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Syncing from SMW Central</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{message}</p>
            
            {total > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{stage === "fetching" ? "Pages" : "Hacks"}</span>
                  <span>{progress} / {total} ({percentage}%)</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {isComplete && (
            <div className="pt-2">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                ✓ Sync completed successfully!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

