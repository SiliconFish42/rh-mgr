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
          className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="appearance-none bg-card border border-border rounded-md px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="name">Name</option>
          <option value="date">Date</option>
          <option value="rating">Rating</option>
          <option value="downloads">Downloads</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
      {onSortDirectionChange && (
        <Button
          onClick={toggleSortDirection}
          variant="outline"
          size="default"
          className="px-3"
          title={sortDirection === "asc" ? "Sort ascending" : "Sort descending"}
        >
          {sortDirection === "asc" ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
        </Button>
      )}
      {onViewModeChange && (
        <div className="flex border border-border rounded-md overflow-hidden">
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("cards")}
            className="rounded-none border-0"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("list")}
            className="rounded-none border-0 border-l border-border"
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

