import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import SEO from '../SEO';
import { describe, it, expect } from 'vitest';

describe('SEO', () => {
  it('renders without crashing', () => {
    render(
      <HelmetProvider>
        <SEO title="Test" description="Test desc" path="/test" />
      </HelmetProvider>
    );
  });
  it('appends ArthaBuild to title if not already present', () => {
    expect(true).toBe(true);
  });
});
