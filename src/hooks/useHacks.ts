import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface HackFilters {
  patchedOnly?: boolean;
  unpatchedOnly?: boolean;
  sortBy?: string;
  sortDirection?: string;
  difficulty?: string;
  hackType?: string; // Deprecated: use hackTypes instead
  hackTypes?: string[]; // Array of hack types for AND filtering
  author?: string;
  minRating?: string;
  page?: number;
  limit?: number; // Custom limit for loading all hacks
}

export function useHacks(filters: HackFilters, enabled: boolean = true) {
  const [hacks, setHacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (enabled) {
      loadHacks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    filters.patchedOnly,
    filters.unpatchedOnly,
    filters.sortBy,
    filters.sortDirection,
    filters.difficulty,
    filters.hackType,
    filters.hackTypes,
    filters.author,
    filters.minRating,
    filters.page,
    filters.limit,
  ]);

  async function loadHacks() {
    setLoading(true);
    try {
      const customLimit = filters.limit;
      const page = filters.page || 1;
      const pageSize = customLimit || 50; // Use custom limit or default page size
      const offset = customLimit ? 0 : (page - 1) * pageSize; // If using custom limit, start from 0
      
      const result = await invoke("get_hacks", { 
        limit: pageSize, 
        offset: offset,
        filters: {
          patched_only: filters.patchedOnly,
          unpatched_only: filters.unpatchedOnly,
          sort_by: filters.sortBy,
          sort_direction: filters.sortDirection,
          difficulty: filters.difficulty || undefined,
          hack_type: filters.hackType || undefined, // Legacy support
          hack_types: filters.hackTypes && filters.hackTypes.length > 0 ? filters.hackTypes : undefined,
          author: filters.author || undefined,
          min_rating: filters.minRating ? parseFloat(filters.minRating) : undefined,
        }
      }) as any[];
      setHacks(result);
    } catch (e) {
      console.error("Failed to load hacks:", e);
    } finally {
      setLoading(false);
    }
  }

  return { hacks, loading, loadHacks };
}

