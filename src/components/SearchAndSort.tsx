import { Search, ChevronDown, Grid3x3, List, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewMode = "cards" | "list";

interface SearchAndSortProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortDirection?: string;
  onSortDirectionChange?: (direction: string) => void;
  showRefresh?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function SearchAndSort({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search for hacks by name, author...",
  sortBy,
  onSortByChange,
  sortDirection = "asc",
  onSortDirectionChange,
  showRefresh = false,
  onRefresh,
  refreshing = false,
  viewMode = "cards",
  onViewModeChange,
}: SearchAndSortProps) {
  const toggleSortDirection = () => {
    if (onSortDirectionChange) {
      onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc");
    }
  };

  return (
    <div className="flex gap-4 mb-6 flex-shrink-0">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full h-9 pl-10 pr-4 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex bg-card rounded-md shadow-sm">
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="appearance-none h-9 w-full bg-card border border-border border-r-0 rounded-l-md px-4 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:z-10 relative"
          >
            <option value="name">Name</option>
            <option value="date">Date</option>
            <option value="rating">Rating</option>
            <option value="downloads">Downloads</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-20" />
        </div>
        {onSortDirectionChange && (
          <Button
            onClick={toggleSortDirection}
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
        )}
      </div>
      {onViewModeChange && (
        <div className="flex border border-border rounded-md overflow-hidden">
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("cards")}
            className="rounded-none border-0 w-9 h-9"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("list")}
            className="rounded-none border-0 border-l border-border w-9 h-9"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      )}
      {showRefresh && onRefresh && (
        <Button onClick={onRefresh} disabled={refreshing}>
          Refresh
        </Button>
      )}
    </div>
  );
}

