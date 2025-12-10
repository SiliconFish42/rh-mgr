import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useFilters() {
  const [availableDifficulties, setAvailableDifficulties] = useState<string[]>([]);
  const [availableHackTypes, setAvailableHackTypes] = useState<string[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterAuthor, setFilterAuthor] = useState<string>("");
  const [filterMinRating, setFilterMinRating] = useState<string>("");
  
  // Discover mode multi-select filters
  const [difficultyFilters, setDifficultyFilters] = useState<Record<string, boolean>>({});
  const [hackTypeFilters, setHackTypeFilters] = useState<Record<string, boolean>>({});
  const [ratingValue, setRatingValue] = useState<number>(4);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  async function loadFilterOptions() {
    try {
      const options = await invoke("get_filter_options") as { difficulties: string[]; hack_types: string[] };
      setAvailableDifficulties(options.difficulties);
      setAvailableHackTypes(options.hack_types);
      
      // Initialize filters with all options checked
      const initialDifficultyFilters: Record<string, boolean> = {};
      options.difficulties.forEach(diff => {
        initialDifficultyFilters[diff] = true;
      });
      setDifficultyFilters(initialDifficultyFilters);
      
      const initialHackTypeFilters: Record<string, boolean> = {};
      options.hack_types.forEach(type => {
        initialHackTypeFilters[type] = true;
      });
      setHackTypeFilters(initialHackTypeFilters);
    } catch (e) {
      console.error("Failed to load filter options:", e);
    }
  }

  function clearFilters() {
    setFilterDifficulty("");
    setFilterType("");
    setFilterAuthor("");
    setFilterMinRating("");
    
    const clearedDifficulties: Record<string, boolean> = {};
    availableDifficulties.forEach(diff => {
      clearedDifficulties[diff] = false;
    });
    setDifficultyFilters(clearedDifficulties);
    
    const clearedTypes: Record<string, boolean> = {};
    availableHackTypes.forEach(type => {
      clearedTypes[type] = false;
    });
    setHackTypeFilters(clearedTypes);
    
    setRatingValue(0);
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

