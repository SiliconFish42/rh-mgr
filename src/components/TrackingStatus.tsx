import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TrackingStatusData {
    connected: boolean;
    attached: boolean;
    in_level: boolean;
    game_mode: number;
}

export function TrackingStatus() {
    const [status, setStatus] = useState<TrackingStatusData | null>(null);
    const [enabled, setEnabled] = useState<boolean>(true);

    useEffect(() => {
        const checkConfig = async () => {
            const config = await invoke("get_config") as { enable_auto_tracking?: boolean };
            setEnabled(config.enable_auto_tracking ?? false);
        };
        checkConfig();

        const poll = async () => {
            try {
                const res = await invoke<TrackingStatusData>('get_tracking_status');
                setStatus(res);
            } catch (e) {
                console.error(e);
            }
        };

        const interval = setInterval(() => {
            checkConfig(); // Poll config too? Or just rely on initial. Let's poll to react to changes.
            poll();
        }, 2000);
        poll();
        return () => clearInterval(interval);
    }, []);

    if (!enabled) return null;
    if (!status) return null;

    let color = "text-muted-foreground";
    let statusClass = "bg-muted-foreground";
    let text = "Disconnected";

    if (status.connected) {
        text = "Connected";
        color = "text-yellow-500";
        statusClass = "bg-yellow-500";
        if (status.attached) {
            text = "Ready";
            color = "text-green-500";
            statusClass = "bg-green-500";
            if (status.in_level) {
                text = "Playing";
            }
        }
    }

    return (
        <div className={`flex items-center gap-2 text-sm mr-4`}>
            <div className={`w-2 h-2 rounded-full ${statusClass}`} />
            <span className={`${color}`}>{text}</span>
        </div>
    );
}
