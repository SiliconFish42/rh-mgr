import { useState, useEffect } from "react";
import { HackGrid } from "./HackGrid";
import { HackList } from "./HackList";
import { FilterSidebar } from "@/components/FilterSidebar";
import { SearchAndSort, ViewMode } from "@/components/SearchAndSort";
import { HackDetailWrapper } from "@/components/HackDetailWrapper";
import { useHacks } from "@/hooks/useHacks";
import { useFilters } from "@/hooks/useFilters";
import { useHackActions } from "@/hooks/useHackActions";
import { useSorting } from "@/hooks/useSorting";

const VIEW_MODE_STORAGE_KEY = "library-view-mode";

export function LibraryView() {
  const [selectedHack, setSelectedHack] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return (stored === "list" || stored === "cards") ? stored : "cards";
  });
  const { sortBy, setSortBy, sortDirection, setSortDirection } = useSorting();

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const {
    availableDifficulties,
    availableHackTypes,
    filterDifficulty,
    setFilterDifficulty,
    filterType,
    setFilterType,
    filterAuthor,
    setFilterAuthor,
    filterMinRating,
    setFilterMinRating,
    clearFilters,
  } = useFilters();

  const { hacks, loading, loadHacks } = useHacks(
    {
      patchedOnly: true,
      sortBy,
      sortDirection,
      difficulty: filterDifficulty,
      hackType: filterType,
      author: filterAuthor,
      minRating: filterMinRating,
    },
    true
  );

  const { launchHack, patchHack } = useHackActions();

  function handleClearFilters() {
    clearFilters();
    loadHacks();
  }

  return (
    <div className="flex h-full relative">
      <FilterSidebar
        isOpen={sidebarOpen}
        onToggle={setSidebarOpen}
        mode="library"
        availableDifficulties={availableDifficulties}
        availableHackTypes={availableHackTypes}
        filterDifficulty={filterDifficulty}
        filterType={filterType}
        filterAuthor={filterAuthor}
        filterMinRating={filterMinRating}
        onFilterDifficultyChange={setFilterDifficulty}
        onFilterTypeChange={setFilterType}
        onFilterAuthorChange={setFilterAuthor}
        onFilterMinRatingChange={setFilterMinRating}
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
          />
        ) : (
          /* Grid View with Search and Sort */
          <div className="flex flex-col h-full overflow-hidden p-8">
            {/* Header */}
            <div className="mb-8 flex-shrink-0">
              <h1 className="text-3xl font-bold mb-2">Library</h1>
              <p className="text-muted-foreground">
                Your collection of patched Super Mario World ROM hacks.
              </p>
            </div>

            {/* Search and Sort */}
            <SearchAndSort
              searchValue={filterAuthor}
              onSearchChange={setFilterAuthor}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortDirection={sortDirection}
              onSortDirectionChange={setSortDirection}
              showRefresh={true}
              onRefresh={loadHacks}
              refreshing={loading}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {/* Hack Grid or List */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {viewMode === "cards" ? (
                <HackGrid hacks={hacks} loading={loading} onHackSelect={setSelectedHack} />
              ) : (
                <HackList hacks={hacks} loading={loading} onHackSelect={setSelectedHack} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

