import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useFilters(persistenceKey?: string) {
  const [availableDifficulties, setAvailableDifficulties] = useState<string[]>([]);
  const [availableHackTypes, setAvailableHackTypes] = useState<string[]>([]);

  // Library mode filters (single select)
  const [filterDifficulty, setFilterDifficulty] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterAuthor, setFilterAuthor] = useState<string>("");
  const [filterMinRating, setFilterMinRating] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Discover mode multi-select filters
  const [difficultyFilters, setDifficultyFilters] = useState<Record<string, boolean>>({});
  const [hackTypeFilters, setHackTypeFilters] = useState<Record<string, boolean>>({});
  const [ratingValue, setRatingValue] = useState<number>(0); // Default to 0 (no minimum)

  // Internal state to track if we've loaded from storage
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadFilterOptions();
    if (persistenceKey) {
      loadFiltersFromStorage();
    }
    setIsLoaded(true);
  }, [persistenceKey]);

  // Save filters to storage whenever they change
  useEffect(() => {
    if (!isLoaded || !persistenceKey) return;

    const stateToSave = {
      filterDifficulty,
      filterType,
      filterAuthor,
      filterMinRating,
      filterStatus,
      difficultyFilters,
      hackTypeFilters,
      ratingValue,
    };

    localStorage.setItem(persistenceKey, JSON.stringify(stateToSave));
  }, [
    isLoaded,
    persistenceKey,
    filterDifficulty,
    filterType,
    filterAuthor,
    filterMinRating,
    filterStatus,
    difficultyFilters,
    hackTypeFilters,
    ratingValue
  ]);

  async function loadFilterOptions() {
    try {
      const options = await invoke("get_filter_options") as { difficulties: string[]; hack_types: string[] };
      setAvailableDifficulties(options.difficulties);
      setAvailableHackTypes(options.hack_types);

      // We no longer initialize filters with all options checked by default
    } catch (e) {
      console.error("Failed to load filter options:", e);
    }
  }

  function loadFiltersFromStorage() {
    if (!persistenceKey) return;

    try {
      const stored = localStorage.getItem(persistenceKey);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Restore single select filters
        if (parsed.filterDifficulty !== undefined) setFilterDifficulty(parsed.filterDifficulty);
        if (parsed.filterType !== undefined) setFilterType(parsed.filterType);
        if (parsed.filterAuthor !== undefined) setFilterAuthor(parsed.filterAuthor);
        if (parsed.filterMinRating !== undefined) setFilterMinRating(parsed.filterMinRating);
        if (parsed.filterStatus !== undefined) setFilterStatus(parsed.filterStatus);

        // Restore multi-select filters
        if (parsed.difficultyFilters !== undefined) setDifficultyFilters(parsed.difficultyFilters);
        if (parsed.hackTypeFilters !== undefined) setHackTypeFilters(parsed.hackTypeFilters);
        if (parsed.ratingValue !== undefined) setRatingValue(parsed.ratingValue);
      }
    } catch (e) {
      console.error("Failed to load filters from storage:", e);
    }
  }

  function clearFilters() {
    // Clear state
    setFilterDifficulty("");
    setFilterType("");
    setFilterAuthor("");
    setFilterMinRating("");
    setFilterStatus("");
    setDifficultyFilters({});
    setHackTypeFilters({});
    setRatingValue(0);

    // Clear storage if applicable
    if (persistenceKey) {
      localStorage.removeItem(persistenceKey);
    }
  }

  return {
    // Available options
    availableDifficulties,
    availableHackTypes,
    // Library mode filters (single select)
    filterDifficulty,
    setFilterDifficulty,
    filterType,
    setFilterType,
    filterAuthor,
    setFilterAuthor,
    filterMinRating,
    setFilterMinRating,
    filterStatus,
    setFilterStatus,
    // Discover mode filters (multi select)
    difficultyFilters,
    setDifficultyFilters,
    hackTypeFilters,
    setHackTypeFilters,
    ratingValue,
    setRatingValue,
    // Actions
    loadFilterOptions,
    clearFilters,
  };
}

