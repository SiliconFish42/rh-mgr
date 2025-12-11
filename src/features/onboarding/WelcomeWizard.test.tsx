import { render, screen } from '@testing-library/react';
import { WelcomeWizard } from './WelcomeWizard';
import { describe, it, expect, vi } from 'vitest';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('WelcomeWizard', () => {
  it('renders the select button', () => {
    render(<WelcomeWizard onComplete={() => { }} />);
    expect(screen.getByText(/Select Clean SMW ROM/i)).toBeInTheDocument();
  });
});

