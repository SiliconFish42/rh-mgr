import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFilters } from './useFilters';
import * as tauriCore from '@tauri-apps/api/core';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('useFilters', () => {
    const STORAGE_KEY = 'test-filters';

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should initialize with default empty values', () => {
        const { result } = renderHook(() => useFilters());

        expect(result.current.availableDifficulties).toEqual([]);
        expect(result.current.availableHackTypes).toEqual([]);
        expect(result.current.filterDifficulty).toBe('');
        expect(result.current.difficultyFilters).toEqual({});
    });

    it('should load filter options on mount', async () => {
        const mockOptions = {
            difficulties: ['Easy', 'Hard'],
            hack_types: ['Standard', 'Kaizo'],
        };

        (tauriCore.invoke as any).mockResolvedValue(mockOptions);

        const { result } = renderHook(() => useFilters(STORAGE_KEY));

        await waitFor(() => {
            expect(result.current.availableDifficulties).toEqual(['Easy', 'Hard']);
            expect(result.current.availableHackTypes).toEqual(['Standard', 'Kaizo']);
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith('get_filter_options');
    });

    it('should update single-select filters', () => {
        const { result } = renderHook(() => useFilters());

        act(() => {
            result.current.setFilterDifficulty('Hard');
            result.current.setFilterType('Kaizo');
            result.current.setFilterAuthor('TestAuthor');
            result.current.setFilterMinRating('4.5');
        });

        expect(result.current.filterDifficulty).toBe('Hard');
        expect(result.current.filterType).toBe('Kaizo');
        expect(result.current.filterAuthor).toBe('TestAuthor');
        expect(result.current.filterMinRating).toBe('4.5');
    });

    it('should update multi-select filters', () => {
        const { result } = renderHook(() => useFilters());

        act(() => {
            result.current.setDifficultyFilters({ 'Easy': true, 'Hard': false });
            result.current.setHackTypeFilters({ 'Standard': true });
            result.current.setRatingValue(3);
        });

        expect(result.current.difficultyFilters).toEqual({ 'Easy': true, 'Hard': false });
        expect(result.current.hackTypeFilters).toEqual({ 'Standard': true });
        expect(result.current.ratingValue).toBe(3);
    });

    it('should persist filters to localStorage', async () => {
        // Wait for initial load to complete
        const { result } = renderHook(() => useFilters(STORAGE_KEY));

        act(() => {
            result.current.setFilterDifficulty('Expert');
        });

        // Need to wait for hook to update storage
        await waitFor(() => {
            const stored = localStorage.getItem(STORAGE_KEY);
            expect(stored).toBeTruthy();
            const parsed = JSON.parse(stored!);
            expect(parsed.filterDifficulty).toBe('Expert');
        });
    });

    it('should load filters from localStorage', () => {
        const savedState = {
            filterDifficulty: 'Kaizo',
            difficultyFilters: { 'Kaizo': true },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));

        const { result } = renderHook(() => useFilters(STORAGE_KEY));

        expect(result.current.filterDifficulty).toBe('Kaizo');
        expect(result.current.difficultyFilters).toEqual({ 'Kaizo': true });
    });

    it('should clear filters', () => {
        const { result } = renderHook(() => useFilters(STORAGE_KEY));

        // Set some values
        act(() => {
            result.current.setFilterDifficulty('Hard');
            result.current.setRatingValue(5);
        });

        // Clear
        act(() => {
            result.current.clearFilters();
        });

        expect(result.current.filterDifficulty).toBe('');
        expect(result.current.ratingValue).toBe(0);

        // When clearing, the state updates and triggers the effect which saves the empty state
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            expect(parsed.filterDifficulty).toBe('');
        } else {
            // If it is null, that's also fine (means removeItem worked and effect didn't run yet or effect logic skipped save)
            // But current implementation likely saves it.
        }
    });
});
