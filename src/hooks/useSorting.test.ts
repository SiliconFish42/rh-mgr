import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSorting } from './useSorting';

describe('useSorting', () => {
    const STORAGE_KEY = 'test-sorting';

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should initialize with default values', () => {
        const { result } = renderHook(() => useSorting(undefined, 'name', 'asc'));
        expect(result.current.sortBy).toBe('name');
        expect(result.current.sortDirection).toBe('asc');
    });

    it('should updates values', () => {
        const { result } = renderHook(() => useSorting());

        act(() => {
            result.current.setSortBy('rating');
        });
        expect(result.current.sortBy).toBe('rating');

        act(() => {
            result.current.setSortDirection('desc');
        });
        expect(result.current.sortDirection).toBe('desc');
    });

    it('should persist to localStorage when storageKey is provided', () => {
        const { result } = renderHook(() => useSorting(STORAGE_KEY));

        act(() => {
            result.current.setSortBy('downloads');
        });
        expect(localStorage.getItem(`${STORAGE_KEY}-by`)).toBe('downloads');

        act(() => {
            result.current.setSortDirection('asc');
        });
        expect(localStorage.getItem(`${STORAGE_KEY}-direction`)).toBe('asc');
    });

    it('should initialize from localStorage', () => {
        localStorage.setItem(`${STORAGE_KEY}-by`, 'date');
        localStorage.setItem(`${STORAGE_KEY}-direction`, 'desc');

        const { result } = renderHook(() => useSorting(STORAGE_KEY));
        expect(result.current.sortBy).toBe('date');
        expect(result.current.sortDirection).toBe('desc');
    });
});
