import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDatabaseSync } from './useDatabaseSync';
import * as tauriCore from '@tauri-apps/api/core';
import * as tauriEvent from '@tauri-apps/api/event';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(),
}));

describe('useDatabaseSync', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should load last sync time from localStorage', () => {
        const timestamp = Date.now() - 1000 * 60 * 5; // 5 minutes ago
        localStorage.setItem('lastSyncTimestamp', timestamp.toString());

        const { result } = renderHook(() => useDatabaseSync());
        expect(result.current.lastSyncTime).toMatch(/minutes ago/);
    });

    it('should call sync_database invoke when syncDatabase is called', async () => {
        (tauriCore.invoke as any).mockResolvedValue(undefined);

        const { result } = renderHook(() => useDatabaseSync());

        await act(async () => {
            await result.current.syncDatabase();
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith('sync_database');
        expect(result.current.syncing).toBe(true);
        expect(result.current.syncProgress).toMatchObject({
            stage: 'fetching',
            message: 'Starting sync...',
        });
    });

    it('should handle sync progress events', async () => {
        let progressCallback: any;
        (tauriEvent.listen as any).mockImplementation((event: string, cb: any) => {
            if (event === 'sync-progress') {
                progressCallback = cb;
            }
            return Promise.resolve(() => { });
        });

        const { result } = renderHook(() => useDatabaseSync());

        // Wait for effect to run and setup listener
        await waitFor(() => expect(tauriEvent.listen).toHaveBeenCalled());

        expect(progressCallback).toBeDefined();

        // Simulate progress event
        act(() => {
            progressCallback({
                payload: {
                    stage: 'processing',
                    message: 'Processing hacks...',
                    progress: 50,
                    total: 100,
                },
            });
        });

        expect(result.current.syncProgress).toMatchObject({
            stage: 'processing',
            progress: 50,
        });
    });

    it('should handle sync completion', async () => {
        let progressCallback: any;
        (tauriEvent.listen as any).mockImplementation((_e: string, cb: any) => {
            progressCallback = cb;
            return Promise.resolve(() => { });
        });

        const onSyncComplete = vi.fn();
        const { result } = renderHook(() => useDatabaseSync(onSyncComplete));

        await waitFor(() => expect(progressCallback).toBeDefined());

        vi.useFakeTimers();

        // Simulate completion
        await act(async () => {
            // Trigger sync start
            result.current.syncDatabase();
        });

        await act(async () => {
            progressCallback({
                payload: {
                    stage: 'complete',
                    message: 'Done',
                    progress: 100,
                    total: 100,
                },
            });
        });

        // Advance timers to trigger state updates
        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.syncing).toBe(false);
        expect(onSyncComplete).toHaveBeenCalled();
        expect(localStorage.getItem('lastSyncTimestamp')).toBeTruthy();

        vi.useRealTimers();
    });
});
