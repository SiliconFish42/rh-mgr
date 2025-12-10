import { useState, useEffect } from "react";

export function useSorting(
  storageKey?: string,
  defaultSortBy: string = "date",
  defaultSortDirection: string = "desc"
) {
  const [sortBy, setSortBy] = useState<string>(() => {
    if (storageKey) {
      const stored = localStorage.getItem(`${storageKey}-by`);
      if (stored) return stored;
    }
    return defaultSortBy;
  });

  const [sortDirection, setSortDirection] = useState<string>(() => {
    if (storageKey) {
      const stored = localStorage.getItem(`${storageKey}-direction`);
      if (stored) return stored;
    }
    return defaultSortDirection;
  });

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`${storageKey}-by`, sortBy);
    }
  }, [sortBy, storageKey]);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`${storageKey}-direction`, sortDirection);
    }
  }, [sortDirection, storageKey]);

  return {
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
  };
}

