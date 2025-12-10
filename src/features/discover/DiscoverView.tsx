import { useState, useEffect, useMemo } from "react";
import { ChevronDown, Grid3x3, List, ArrowUp, ArrowDown } from "lucide-react";
import { HackGrid } from "@/features/library/HackGrid";
import { HackList } from "@/features/library/HackList";
import { FilterSidebar } from "@/components/FilterSidebar";
import { SearchWithAutocomplete } from "@/components/SearchWithAutocomplete";
import { HackDetailWrapper } from "@/components/HackDetailWrapper";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/Pagination";
import { useHacks } from "@/hooks/useHacks";
import { useFilters } from "@/hooks/useFilters";
import { useHackActions } from "@/hooks/useHackActions";
import { useSorting } from "@/hooks/useSorting";
import Fuse from "fuse.js";

export type ViewMode = "cards" | "list";

const VIEW_MODE_STORAGE_KEY = "discover-view-mode";

export function DiscoverView() {
  const [selectedHack, setSelectedHack] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return (stored === "list" || stored === "cards") ? stored : "cards";
  });
  const { sortBy, setSortBy, sortDirection, setSortDirection } = useSorting("discover-sorting");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [shouldLoadAllHacks, setShouldLoadAllHacks] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Debounce search query to avoid performance issues
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Lazy load all hacks only when user starts typing (for better initial load performance)
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length >= 1 && !shouldLoadAllHacks) {
      setShouldLoadAllHacks(true);
    }
  }, [searchQuery, shouldLoadAllHacks]);

  const {
    availableDifficulties,
    availableHackTypes,
    filterDifficulty,
    setFilterDifficulty,
    filterType,
    setFilterType,
    filterAuthor,
    filterMinRating,
    setFilterMinRating,
    difficultyFilters,
    setDifficultyFilters,
    hackTypeFilters,
    setHackTypeFilters,
    ratingValue,
    setRatingValue,
    clearFilters,
  } = useFilters("discover-filters");

  // Convert multi-select filters to filter values for API
  // Note: We keep filterType for backward compatibility but use hackTypes array for AND filtering
  const selectedTypes = useMemo(() => {
    return Object.entries(hackTypeFilters)
      .filter(([_, checked]) => checked)
      .map(([key]) => key);
  }, [hackTypeFilters]);

  const selectedDifficulties = useMemo(() => {
    return Object.entries(difficultyFilters)
      .filter(([_, checked]) => checked)
      .map(([key]) => key);
  }, [difficultyFilters]);

  useEffect(() => {
    // Only update single select filters (for backward compat or if needed by other components)
    // but we use the array versions for querying now in Discover mode
    const newDifficulty = selectedDifficulties.length > 0 ? selectedDifficulties[0] : "";
    const newType = selectedTypes.length > 0 ? selectedTypes[0] : ""; // Keep for backward compatibility
    const newMinRating = ratingValue === 0 ? "" : ratingValue.toString();

    if (newDifficulty !== filterDifficulty || newType !== filterType || newMinRating !== filterMinRating) {
      setFilterDifficulty(newDifficulty);
      setFilterType(newType);
      setFilterMinRating(newMinRating);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficultyFilters, selectedTypes, ratingValue]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDifficulty, filterType, filterAuthor, filterMinRating, sortBy, sortDirection, debouncedSearchQuery, selectedDifficulties]);

  // Load all hacks for search and autocomplete (with a large limit to get all hacks)
  // Only load when user starts typing to improve initial page load
  const { hacks: allHacksForSearch, loading: loadingAllHacks } = useHacks(
    {
      unpatchedOnly: true,
      sortBy: "name", // Simple sort for search index
      sortDirection: "asc",
      difficulty: filterDifficulty, // Fallback
      difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : undefined,
      hackTypes: selectedTypes.length > 0 ? selectedTypes : undefined, // Use AND logic for multiple types
      minRating: filterMinRating,
      limit: 10000, // Large limit to get all hacks for search
    },
    shouldLoadAllHacks // Only load when user starts typing
  );

  // Load paginated hacks for display (only when not searching)
  const { hacks: paginatedHacks, loading: loadingPaginated } = useHacks(
    {
      unpatchedOnly: true,
      sortBy,
      sortDirection,
      difficulty: filterDifficulty, // Fallback
      difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : undefined,
      hackTypes: selectedTypes.length > 0 ? selectedTypes : undefined, // Use AND logic for multiple types
      minRating: filterMinRating,
      page: currentPage,
    },
    !debouncedSearchQuery || debouncedSearchQuery.trim().length < 2 // Only load paginated when not searching
  );

  // Use all hacks for search/autocomplete, paginated hacks for browsing
  const allHacks = allHacksForSearch; // Always use all hacks for search and autocomplete
  const loading = debouncedSearchQuery && debouncedSearchQuery.trim().length >= 2 ? loadingAllHacks : loadingPaginated;

  // Preprocess hacks to extract searchable text from JSON fields - only when data changes
  const processedHacks = useMemo(() => {
    if (allHacks.length === 0) return [];

    return allHacks.map((hack) => {
      let authorsText = "";
      let tagsText = "";

      // Extract authors text
      if (hack.authors) {
        try {
          const authors = JSON.parse(hack.authors);
          if (Array.isArray(authors)) {
            authorsText = authors
              .map((a: any) => a?.name || a)
              .filter(Boolean)
              .join(" ");
          }
        } catch {
          authorsText = typeof hack.authors === "string" ? hack.authors : "";
        }
      }

      // Extract tags text
      if (hack.tags) {
        try {
          const tags = JSON.parse(hack.tags);
          if (Array.isArray(tags)) {
            tagsText = tags.filter(Boolean).join(" ");
          }
        } catch {
          tagsText = typeof hack.tags === "string" ? hack.tags : "";
        }
      }

      return {
        ...hack,
        authorsText,
        tagsText,
      };
    });
  }, [allHacks]);

  // Configure Fuse.js for fuzzy search - only recreate when processed hacks change
  const fuse = useMemo(() => {
    if (processedHacks.length === 0) {
      return null;
    }
    return new Fuse(processedHacks, {
      keys: [
        { name: "name", weight: 0.5 },
        { name: "authorsText", weight: 0.3 },
        { name: "tagsText", weight: 0.15 },
        { name: "description", weight: 0.05 },
      ],
      threshold: 0.4, // Lower = more strict, higher = more fuzzy
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }, [processedHacks]);

  // Apply fuzzy search filtering or use paginated results - use debounced query
  const hacks = useMemo(() => {
    // If searching, use fuzzy search on all hacks
    if (debouncedSearchQuery && debouncedSearchQuery.trim().length >= 2 && fuse) {
      const results = fuse.search(debouncedSearchQuery);
      // Return original hack objects (without processed fields)
      return results.map((result) => {
        const { authorsText, tagsText, ...hack } = result.item;
        return hack;
      });
    }

    // If not searching, use paginated hacks
    return paginatedHacks;
  }, [debouncedSearchQuery, fuse, paginatedHacks]);

  // Determine if there are more pages (if we get exactly 50 results, assume there might be more)
  const hasMorePages = paginatedHacks.length === 50;
  const isLastPage = !hasMorePages && paginatedHacks.length > 0;
  // Estimate last page - we'll show a reasonable maximum or calculate based on current page
  // Since we don't know the total, we'll show pages dynamically around current page
  // If we have more pages, show at least current page + 5, otherwise current page is the last
  const estimatedLastPage = hasMorePages ? Math.max(currentPage + 5, 10) : currentPage;

  const { launchHack, patchHack, isPatching } = useHackActions();

  function handleClearFilters() {
    clearFilters();
  }

  return (
    <div className="flex h-full relative">
      <FilterSidebar
        isOpen={sidebarOpen}
        onToggle={setSidebarOpen}
        mode="discover"
        availableDifficulties={availableDifficulties}
        availableHackTypes={availableHackTypes}
        difficultyFilters={difficultyFilters}
        hackTypeFilters={hackTypeFilters}
        ratingValue={ratingValue}
        onDifficultyFiltersChange={setDifficultyFilters}
        onHackTypeFiltersChange={setHackTypeFilters}
        onRatingValueChange={setRatingValue}
        onClearFilters={handleClearFilters}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedHack ? (
          <HackDetailWrapper
            hack={selectedHack}
            onClose={() => setSelectedHack(null)}
            onLaunch={launchHack}
            onPatch={patchHack}
            isPatching={isPatching}
          />
        ) : (
          /* Grid View with Search and Pagination */
          <div className="flex flex-col h-full overflow-hidden p-8">
            {/* Header */}
            <div className="mb-8 flex-shrink-0">
              <h1 className="text-3xl font-bold mb-2">Discover New Hacks</h1>
              <p className="text-muted-foreground">
                Browse and find new Super Mario World ROM hacks from SMW Central.
              </p>
            </div>

            {/* Search and Sort */}
            <div className="flex gap-4 mb-6 flex-shrink-0">
              <SearchWithAutocomplete
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search for hacks by name, author, tags..."
                items={allHacks}
                maxSuggestions={5}
              />
              <div className="flex bg-card rounded-md shadow-sm">
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none h-9 w-full bg-card border border-border border-r-0 rounded-l-md px-4 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:z-10 relative"
                  >
                    <option value="name">Name</option>
                    <option value="date">Date</option>
                    <option value="rating">Rating</option>
                    <option value="downloads">Downloads</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-20" />
                </div>
                <Button
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                  variant="outline"
                  size="icon"
                  className="w-9 rounded-l-none border-l-0 focus:z-10"
                  title={sortDirection === "asc" ? "Sort ascending" : "Sort descending"}
                >
                  {sortDirection === "asc" ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex border border-border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("cards")}
                  className="rounded-none border-0 w-9 h-9"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="rounded-none border-0 border-l border-border w-9 h-9"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Hack Grid or List */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {viewMode === "cards" ? (
                <HackGrid
                  hacks={hacks}
                  loading={loading}
                  onHackSelect={setSelectedHack}
                  onLaunch={launchHack}
                  onPatch={patchHack}
                  isPatching={isPatching}
                />
              ) : (
                <HackList
                  hacks={hacks}
                  loading={loading}
                  onHackSelect={setSelectedHack}
                  onLaunch={launchHack}
                  onPatch={patchHack}
                  isPatching={isPatching}
                />
              )}
            </div>

            {/* Pagination - only show when not searching */}
            {(!debouncedSearchQuery || debouncedSearchQuery.trim().length < 2) && (
              <Pagination
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                hasMorePages={hasMorePages}
                estimatedLastPage={estimatedLastPage}
                isLastPage={isLastPage}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

