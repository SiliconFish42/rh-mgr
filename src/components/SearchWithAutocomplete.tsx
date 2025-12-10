import { useState, useEffect, useRef, useMemo } from "react";
import { Search, X } from "lucide-react";
import Fuse from "fuse.js";

interface SearchableItem {
  name: string;
  authors?: string | null;
  tags?: string | null;
  description?: string | null;
}

interface SearchWithAutocompleteProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  items: SearchableItem[];
  maxSuggestions?: number;
}

export function SearchWithAutocomplete({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search for hacks by name, author, tags...",
  items,
  maxSuggestions = 5,
}: SearchWithAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Preprocess items to extract searchable text from JSON fields
  const processedItems = useMemo(() => {
    return items.map((item) => {
      let authorsText = "";
      let tagsText = "";

      // Extract authors text
      if (item.authors) {
        try {
          const authors = JSON.parse(item.authors);
          if (Array.isArray(authors)) {
            authorsText = authors
              .map((a: any) => a?.name || a)
              .filter(Boolean)
              .join(" ");
          }
        } catch {
          authorsText = typeof item.authors === "string" ? item.authors : "";
        }
      }

      // Extract tags text
      if (item.tags) {
        try {
          const tags = JSON.parse(item.tags);
          if (Array.isArray(tags)) {
            tagsText = tags.filter(Boolean).join(" ");
          }
        } catch {
          tagsText = typeof item.tags === "string" ? item.tags : "";
        }
      }

      return {
        ...item,
        authorsText,
        tagsText,
      };
    });
  }, [items]);

  // Configure Fuse.js for fuzzy search - only create when we have items
  const fuse = useMemo(() => {
    if (processedItems.length === 0) {
      return null;
    }
    return new Fuse(processedItems, {
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
  }, [processedItems]);

  // Get autocomplete suggestions - limit processing for performance
  const suggestions = useMemo(() => {
    if (!searchValue || searchValue.length < 1 || !fuse) {
      return [];
    }

    // Only search if we have at least 2 characters for better performance
    if (searchValue.length < 2) {
      return [];
    }

    const results = fuse.search(searchValue);
    return results
      .slice(0, maxSuggestions)
      .map((result) => ({
        item: {
          ...result.item,
          // Remove the processed fields for display
          authors: result.item.authors,
          tags: result.item.tags,
        },
        score: result.score,
      }));
  }, [searchValue, fuse, maxSuggestions]);

  // Extract unique searchable terms for autocomplete - cache and limit size for performance
  const allSearchableTerms = useMemo(() => {
    const terms = new Set<string>();
    const maxTerms = 1000; // Limit to prevent performance issues
    
    for (const item of items) {
      if (terms.size >= maxTerms) break;
      
      if (item.name) {
        terms.add(item.name);
      }
      if (item.authors) {
        try {
          const authors = JSON.parse(item.authors);
          if (Array.isArray(authors)) {
            for (const author of authors) {
              if (terms.size >= maxTerms) break;
              if (author?.name) {
                terms.add(author.name);
              }
            }
          }
        } catch {
          // If not JSON, treat as plain string
          if (typeof item.authors === "string" && terms.size < maxTerms) {
            terms.add(item.authors);
          }
        }
      }
      if (item.tags) {
        try {
          const tags = JSON.parse(item.tags);
          if (Array.isArray(tags)) {
            for (const tag of tags) {
              if (terms.size >= maxTerms) break;
              if (tag) {
                terms.add(tag);
              }
            }
          }
        } catch {
          // If not JSON, treat as plain string
          if (typeof item.tags === "string" && terms.size < maxTerms) {
            terms.add(item.tags);
          }
        }
      }
    }

    return Array.from(terms);
  }, [items]);

  // Get autocomplete suggestions from all terms when search is short
  const termSuggestions = useMemo(() => {
    if (!searchValue || searchValue.length < 1) {
      return [];
    }

    const lowerSearch = searchValue.toLowerCase();
    const matching = allSearchableTerms
      .filter((term) => term.toLowerCase().includes(lowerSearch))
      .slice(0, maxSuggestions);

    return matching;
  }, [searchValue, allSearchableTerms, maxSuggestions]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    onSearchChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allSuggestions = suggestions.length > 0 
      ? suggestions.map(s => s.item.name)
      : termSuggestions;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIndex((prev) =>
        prev < allSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      if (allSuggestions[highlightedIndex]) {
        handleSuggestionSelect(allSuggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hasSuggestions = (suggestions.length > 0 || termSuggestions.length > 0) && showSuggestions;

  return (
    <div className="flex-1 relative" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={searchValue}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={searchPlaceholder}
        className="w-full pl-10 pr-10 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {searchValue && (
        <button
          onClick={() => {
            onSearchChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Autocomplete Suggestions */}
      {hasSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.length > 0 ? (
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.item.name}-${index}`}
                  onClick={() => handleSuggestionSelect(suggestion.item.name)}
                  className={`px-4 py-2 cursor-pointer hover:bg-accent ${
                    index === highlightedIndex ? "bg-accent" : ""
                  }`}
                >
                  <div className="font-medium">{suggestion.item.name}</div>
                  {suggestion.item.authors && (
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        try {
                          const authors = JSON.parse(suggestion.item.authors);
                          if (Array.isArray(authors)) {
                            return authors.map((a: any) => a?.name).filter(Boolean).join(", ");
                          }
                        } catch {
                          return suggestion.item.authors;
                        }
                        return "";
                      })()}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="py-1">
              {termSuggestions.map((term, index) => (
                <li
                  key={`${term}-${index}`}
                  onClick={() => handleSuggestionSelect(term)}
                  className={`px-4 py-2 cursor-pointer hover:bg-accent ${
                    index === highlightedIndex ? "bg-accent" : ""
                  }`}
                >
                  <div className="font-medium">{term}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

