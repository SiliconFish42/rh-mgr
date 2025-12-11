import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompletionBadge } from './CompletionBadge';
import * as useCompletions from '../hooks/useCompletions';

// Mock the hook module
vi.mock('../hooks/useCompletions', () => ({
    useCompletionSummary: vi.fn(),
}));

describe('CompletionBadge', () => {
    it('should render nothing when loading', () => {
        (useCompletions.useCompletionSummary as any).mockReturnValue({
            summary: null,
            loading: true,
        });

        const { container } = render(<CompletionBadge hackId={1} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should render nothing when no completions', () => {
        (useCompletions.useCompletionSummary as any).mockReturnValue({
            summary: { total_completions: 0, routes: [] },
            loading: false,
        });

        const { container } = render(<CompletionBadge hackId={1} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should render badge when completions exist', () => {
        (useCompletions.useCompletionSummary as any).mockReturnValue({
            summary: { total_completions: 2, routes: ['Exit A', 'Exit B'] },
            loading: false,
        });

        render(<CompletionBadge hackId={1} />);
        expect(screen.getByText('2 routes')).toBeInTheDocument();
        expect(screen.getByTitle('Completed routes: Exit A, Exit B')).toBeInTheDocument();
    });

    it('should handle singular vs plural', () => {
        (useCompletions.useCompletionSummary as any).mockReturnValue({
            summary: { total_completions: 1, routes: ['Exit A'] },
            loading: false,
        });

        render(<CompletionBadge hackId={1} />);
        expect(screen.getByText('1 route')).toBeInTheDocument();
    });
});
