import { useState } from "react";

export function useSorting(defaultSortBy: string = "name", defaultSortDirection: string = "asc") {
  const [sortBy, setSortBy] = useState<string>(defaultSortBy);
  const [sortDirection, setSortDirection] = useState<string>(defaultSortDirection);

  return {
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
  };
}

