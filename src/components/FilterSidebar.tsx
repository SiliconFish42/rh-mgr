import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FilterMode = "library" | "discover";

interface FilterSidebarProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  mode: FilterMode;
  
  // Available options
  availableDifficulties: string[];
  availableHackTypes: string[];
  
  // Library mode props (single select)
  filterDifficulty?: string;
  filterType?: string;
  filterAuthor?: string;
  filterMinRating?: string;
  onFilterDifficultyChange?: (value: string) => void;
  onFilterTypeChange?: (value: string) => void;
  onFilterAuthorChange?: (value: string) => void;
  onFilterMinRatingChange?: (value: string) => void;
  onClearFilters?: () => void;
  onRefresh?: () => void;
  
  // Discover mode props (multi select)
  difficultyFilters?: Record<string, boolean>;
  hackTypeFilters?: Record<string, boolean>;
  ratingValue?: number;
  onDifficultyFiltersChange?: (filters: Record<string, boolean>) => void;
  onHackTypeFiltersChange?: (filters: Record<string, boolean>) => void;
  onRatingValueChange?: (value: number) => void;
}

export function FilterSidebar({
  isOpen,
  onToggle,
  mode,
  availableDifficulties,
  availableHackTypes,
  // Library props
  filterDifficulty = "",
  filterType = "",
  filterAuthor = "",
  filterMinRating = "",
  onFilterDifficultyChange,
  onFilterTypeChange,
  onFilterAuthorChange,
  onFilterMinRatingChange,
  onClearFilters,
  // Discover props
  difficultyFilters = {},
  hackTypeFilters = {},
  ratingValue = 1,
  onDifficultyFiltersChange,
  onHackTypeFiltersChange,
  onRatingValueChange,
}: FilterSidebarProps) {
  return (
    <>
      {/* Expand Button - Only visible when collapsed */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggle(true)}
          className="absolute left-0 top-4 h-8 w-8 z-20 bg-card border border-border rounded-r-md shadow-md"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
      
      {/* Left Sidebar - Filters */}
      <aside className={`${isOpen ? 'w-64' : 'w-0'} border-r border-border bg-card overflow-hidden transition-all duration-300 flex-shrink-0`}>
        <div className={`${isOpen ? 'p-6' : 'p-0'} overflow-y-auto h-full`}>
          {isOpen && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Filters</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggle(false)}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>

              {/* Difficulty Filters */}
              <div className="mb-8">
                <h3 className="text-sm font-medium mb-3">Difficulty</h3>
                <div className="space-y-2">
                  {availableDifficulties.length > 0 ? (
                    availableDifficulties.map((difficulty) => (
                      <label key={difficulty} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            mode === "library"
                              ? filterDifficulty === difficulty
                              : difficultyFilters[difficulty] || false
                          }
                          onChange={(e) => {
                            if (mode === "library") {
                              onFilterDifficultyChange?.(e.target.checked ? difficulty : "");
                            } else {
                              onDifficultyFiltersChange?.({
                                ...difficultyFilters,
                                [difficulty]: e.target.checked,
                              });
                            }
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm">{difficulty}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No difficulties available</p>
                  )}
                </div>
              </div>

              {/* Hack Type Filters */}
              <div className="mb-8">
                <h3 className="text-sm font-medium mb-3">Hack Type</h3>
                <div className="space-y-2">
                  {availableHackTypes.length > 0 ? (
                    availableHackTypes.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            mode === "library"
                              ? filterType === type
                              : hackTypeFilters[type] || false
                          }
                          onChange={(e) => {
                            if (mode === "library") {
                              onFilterTypeChange?.(e.target.checked ? type : "");
                            } else {
                              onHackTypeFiltersChange?.({
                                ...hackTypeFilters,
                                [type]: e.target.checked,
                              });
                            }
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hack types available</p>
                  )}
                </div>
              </div>

              {/* Library Mode: Author Filter */}
              {mode === "library" && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium mb-3">Author</h3>
                  <input
                    type="text"
                    value={filterAuthor}
                    onChange={(e) => onFilterAuthorChange?.(e.target.value)}
                    placeholder="Filter by author..."
                    className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {/* Rating Filter - Unified for both modes */}
              <div className="mb-8">
                <h3 className="text-sm font-medium mb-3">Min Rating</h3>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={
                    mode === "library"
                      ? filterMinRating ? parseFloat(filterMinRating) : 0
                      : ratingValue ?? 0
                  }
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (mode === "library") {
                      // Empty string for 0 (no minimum), otherwise the value as string
                      onFilterMinRatingChange?.(value === 0 ? "" : value.toString());
                    } else {
                      // For discover mode, 0 means no minimum (null/undefined behavior)
                      onRatingValueChange?.(value === 0 ? 0 : value);
                    }
                  }}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {(() => {
                    const currentValue = mode === "library"
                      ? (filterMinRating ? parseFloat(filterMinRating) : 0)
                      : (ratingValue ?? 0);
                    return currentValue === 0
                      ? "No minimum"
                      : `${currentValue.toFixed(1)} stars and up`;
                  })()}
                </p>
              </div>

              {/* Filter Actions */}
              <div className="space-y-2">
                <Button
                  onClick={onClearFilters}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

