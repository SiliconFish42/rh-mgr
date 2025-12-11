import { render, screen } from '@testing-library/react';
import { HackGrid } from './HackGrid';
import { describe, it, expect, vi } from 'vitest';

const mockHacks = [
  { id: 1, name: 'Hack 1', difficulty: 'Easy' },
  { id: 2, name: 'Hack 2', difficulty: 'Hard' },
];

// Mock useCompletionSummary to avoid Tauri invoke calls
vi.mock('../../hooks/useCompletions', () => ({
  useCompletionSummary: vi.fn().mockReturnValue({ summary: null, loading: false }),
}));

describe('HackGrid', () => {
  it('renders empty state when no hacks', () => {
    render(<HackGrid hacks={[]} />);
    expect(screen.getByText(/No hacks found/i)).toBeInTheDocument();
  });

  it('renders hacks when provided', () => {
    render(<HackGrid hacks={mockHacks} />);
    expect(screen.getByText('Hack 1')).toBeInTheDocument();
    expect(screen.getByText('Hack 2')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<HackGrid hacks={[]} loading={true} />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});

