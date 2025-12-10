import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  hasMorePages: boolean;
  estimatedLastPage: number;
  isLastPage?: boolean;
}

export function Pagination({ currentPage, onPageChange, hasMorePages, estimatedLastPage, isLastPage = false }: PaginationProps) {
  // Calculate which page numbers to show
  // Show current page and 2 pages on each side, plus first and last
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    // Calculate the range of pages to show around current page
    const range = 2; // Show 2 pages on each side of current
    let startPage = Math.max(1, currentPage - range);
    let endPage = currentPage + range;
    
    // If we have an estimated last page and it's greater than current, cap at that
    // But always show at least the current page and range around it
    if (hasMorePages && estimatedLastPage >= currentPage) {
      endPage = Math.min(endPage, estimatedLastPage);
    }
    // If current page is beyond estimated, we still show it (user navigated beyond estimate)
    
    // Always show first page if we're not showing it already
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push("...");
      }
    }
    
    // Show pages around current page
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // Show estimated last page if it's far enough away and we have more pages
    if (hasMorePages && estimatedLastPage > endPage + 1) {
      if (estimatedLastPage > endPage + 2) {
        pages.push("...");
      }
      pages.push(estimatedLastPage);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const isFirstPage = currentPage === 1;

  return (
    <div className="flex justify-center items-center gap-2 mt-8 flex-shrink-0">
      {/* First page button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={isFirstPage}
        title="First page"
      >
        <ChevronsLeft className="w-4 h-4" />
      </Button>
      
      {/* Previous page button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={isFirstPage}
        title="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      
      {/* Page numbers */}
      {pageNumbers.map((page, index) => {
        if (page === "...") {
          return (
            <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
              ...
            </span>
          );
        }
        
        const pageNum = page as number;
        return (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(pageNum)}
          >
            {pageNum}
          </Button>
        );
      })}
      
      {/* Next page button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage || !hasMorePages}
        title="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      
      {/* Last page button - only show if we know there are more pages */}
      {hasMorePages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(estimatedLastPage)}
          disabled={isLastPage}
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

