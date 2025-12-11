import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from './Pagination';

describe('Pagination', () => {
    it('should render correct page numbers', () => {
        render(
            <Pagination
                currentPage={5}
                onPageChange={() => { }}
                hasMorePages={true}
                estimatedLastPage={10}
            />
        );

        // Should see 1, ..., 3, 4, 5, 6, 7, ..., 10
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // Current
        expect(screen.getByText('3')).toBeInTheDocument(); // Range
        expect(screen.getByText('7')).toBeInTheDocument(); // Range
        expect(screen.queryByText('2')).not.toBeInTheDocument(); // Hidden
        expect(screen.getAllByText('...')).toHaveLength(2);
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should handle first page correctly', () => {
        const onPageChange = vi.fn();
        render(
            <Pagination
                currentPage={1}
                onPageChange={onPageChange}
                hasMorePages={true}
                estimatedLastPage={5}
            />
        );

        const prevButton = screen.getByTitle('Previous page');
        expect(prevButton).toBeDisabled();

        const firstButton = screen.getByTitle('First page');
        expect(firstButton).toBeDisabled();

        // Clicking next should work
        const nextButton = screen.getByTitle('Next page');
        fireEvent.click(nextButton);
        expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should active current page', () => {
        render(
            <Pagination
                currentPage={3}
                onPageChange={() => { }}
                hasMorePages={true}
                estimatedLastPage={5}
            />
        );

        expect(screen.getByRole('button', { name: '3' })).toHaveClass('bg-primary');
        expect(screen.getByRole('button', { name: '2' })).not.toHaveClass('bg-primary');
    });

    it('should emit onPageChange event when page number is clicked', () => {
        const onPageChange = vi.fn();
        render(
            <Pagination
                currentPage={1}
                onPageChange={onPageChange}
                hasMorePages={true}
                estimatedLastPage={5}
            />
        );

        fireEvent.click(screen.getByText('2'));
        expect(onPageChange).toHaveBeenCalledWith(2);
    });
});
