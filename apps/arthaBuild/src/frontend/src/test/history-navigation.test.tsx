/**
 * TC-FE-NAV-01..TC-FE-NAV-02 — History page navigation tests
 * Verifies the /app dead-link bug is fixed: chat items link to /chat/:token
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HistoryPage from '../pages/History';

// Mock Sidebar to avoid router/auth complexity in unit test
vi.mock('../components/Sidebar', () => ({
  default: () => <nav data-testid="sidebar" />,
}));

// Mock useChat to return a controlled chat list
const mockChats = [
  { id: 'chat-001', title: 'How to create a SuiteScript?', messages: [{}, {}] },
  { id: 'chat-002', title: 'Deploy User Event script', messages: [{}] },
];

vi.mock('../hooks/useChat', () => ({
  useChat: () => ({ chats: mockChats }),
}));

// Mock encodeId to return a predictable value for testing
vi.mock('../lib/crypto', () => ({
  encodeId: (id: string) => `encoded-${id}`,
  decodeId: (token: string) => token.replace('encoded-', ''),
}));

describe('TC-FE-NAV-01: History items link to /chat/:token (not /app)', () => {
  it('renders chat items with correct /chat/ routes', () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    );

    const links = screen.getAllByRole('link');
    // Each link should point to /chat/encoded-<id>, NOT /app
    links.forEach((link) => {
      const href = link.getAttribute('href') ?? '';
      expect(href).not.toBe('/app');
      expect(href).toMatch(/^\/chat\//);
    });
  });
});

describe('TC-FE-NAV-02: History shows chat titles and message counts', () => {
  it('renders title and message count for each chat', () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    );

    expect(screen.getByText('How to create a SuiteScript?')).toBeInTheDocument();
    expect(screen.getByText('Deploy User Event script')).toBeInTheDocument();
    expect(screen.getByText('2 messages')).toBeInTheDocument();
    expect(screen.getByText('1 messages')).toBeInTheDocument();
  });
});
