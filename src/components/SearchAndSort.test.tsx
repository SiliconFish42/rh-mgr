import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchAndSort } from './SearchAndSort';

describe('SearchAndSort', () => {
    it('should render search input with value', () => {
        const onSearchChange = vi.fn();
        render(
            <SearchAndSort
                searchValue="Super Mario"
                onSearchChange={onSearchChange}
                sortBy="name"
                onSortByChange={() => { }}
            />
        );

        const input = screen.getByDisplayValue('Super Mario');
        expect(input).toBeInTheDocument();

        fireEvent.change(input, { target: { value: 'Luigi' } });
        expect(onSearchChange).toHaveBeenCalledWith('Luigi');
    });

    it('should render sort select', () => {
        const onSortByChange = vi.fn();
        render(
            <SearchAndSort
                searchValue=""
                onSearchChange={() => { }}
                sortBy="date"
                onSortByChange={onSortByChange}
            />
        );

        const select = screen.getByDisplayValue('Date'); // Displays text content of option
        expect(screen.getByRole('combobox')).toHaveValue('date');

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'rating' } });
        expect(onSortByChange).toHaveBeenCalledWith('rating');
    });

    it('should toggle sort direction', () => {
        const onSortDirectionChange = vi.fn();
        render(
            <SearchAndSort
                searchValue=""
                onSearchChange={() => { }}
                sortBy="name"
                onSortByChange={() => { }}
                sortDirection="asc"
                onSortDirectionChange={onSortDirectionChange}
            />
        );

        const button = screen.getByTitle('Sort ascending');
        fireEvent.click(button);
        expect(onSortDirectionChange).toHaveBeenCalledWith('desc');
    });

    it('should switch view mode', () => {
        const onViewModeChange = vi.fn();
        render(
            <SearchAndSort
                searchValue=""
                onSearchChange={() => { }}
                sortBy="name"
                onSortByChange={() => { }}
                viewMode="cards"
                onViewModeChange={onViewModeChange}
            />
        );

        // Need to find by icon or some other means, here assuming structure
        // List icon button usually 2nd in toggle group
        const listButtons = screen.getAllByRole('button');
        // We expect direction toggle + 2 view mode buttons = 3 buttons if sort direction enabled (it's not here by default if props missing, wait provided props has no direction chang)
        // Actually our test above provided onSortDirectionChange, this one didn't.
        // So distinct buttons for grid/list. 
        // Grid icon is Lucide Grid3x3, List is List. 
        // We can just rely on indices or test id if we added them. 
        // Let's assume the button order is consistent. Grid first, then List.

        // But checking implementation:
        // <Button onClick={() => onViewModeChange("cards")} ...>
        // <Button onClick={() => onViewModeChange("list")} ...>

        // We can try to select by class content if we can't select by icon easy without setup.
        // Simplifying: let's modify the component to add aria-labels or just trigger index 1 (list)

        // Actually the button variants change based on active.
        // List is inactive (ghost).

        const buttons = screen.getAllByRole('button');
        // first is grid, second is list (if direction button not present)
        fireEvent.click(buttons[1]);
        expect(onViewModeChange).toHaveBeenCalledWith('list');
    });
});
