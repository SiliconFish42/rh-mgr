import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, Trash2 } from "lucide-react";

interface LogViewerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LogViewer({ isOpen, onClose }: LogViewerProps) {
    const [logs, setLogs] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen]);

    async function fetchLogs() {
        setLoading(true);
        try {
            const content = await invoke<string>("get_log_content");
            setLogs(content);
        } catch (e) {
            console.error("Failed to fetch logs:", e);
            setLogs(`Error loading logs: ${e}`);
        } finally {
            setLoading(false);
        }
    }

    async function clearLogs() {
        if (!confirm("Are you sure you want to clear the logs?")) return;

        try {
            await invoke("clear_log");
            fetchLogs();
        } catch (e) {
            console.error("Failed to clear logs:", e);
            alert(`Failed to clear logs: ${e}`);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-xl font-semibold">Application Logs</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button variant="destructive" size="sm" onClick={clearLogs}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 bg-muted/30 font-mono text-xs md:text-sm">
                    <pre className="whitespace-pre-wrap break-words">{logs}</pre>
                </div>
            </div>
        </div>
    );
}
