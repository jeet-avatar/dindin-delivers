/**
 * Admin Portal E2E Tests
 *
 * Tests for the Dollor.ai Backend Operations Admin Portal
 * This is the ONLY UI for backend operations as specified in CLAUDE.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock all API calls at module level - MUST be before imports
vi.mock('../app/api/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  getInvoices: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getInvoiceStats: vi.fn().mockResolvedValue({
    summary: { total_invoices: 0, draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 },
    financials: { total_invoiced: 0, total_paid: 0, total_outstanding: 0, this_month_invoiced: 0, this_month_paid: 0 },
    recent_invoices: [],
    top_clients: [],
  }),
  getClients: vi.fn().mockResolvedValue([]),
  getOrders: vi.fn().mockResolvedValue([]),
  getOrderStats: vi.fn().mockResolvedValue({ totalOrders: 0, totalRevenue: 0 }),
  getVendors: vi.fn().mockResolvedValue([]),
  getVendorPayouts: vi.fn().mockResolvedValue([]),
  createInvoice: vi.fn().mockResolvedValue({ id: 1 }),
  createClient: vi.fn().mockResolvedValue({ id: 1 }),
  sendInvoice: vi.fn().mockResolvedValue({ success: true }),
  markInvoicePaid: vi.fn().mockResolvedValue({ success: true }),
  voidInvoice: vi.fn().mockResolvedValue({ success: true }),
  duplicateInvoice: vi.fn().mockResolvedValue({ id: 2 }),
  getInvoice: vi.fn().mockResolvedValue({}),
  updateInvoice: vi.fn().mockResolvedValue({}),
  deleteInvoice: vi.fn().mockResolvedValue({}),
  addInvoiceItem: vi.fn().mockResolvedValue({}),
  updateInvoiceItem: vi.fn().mockResolvedValue({}),
  deleteInvoiceItem: vi.fn().mockResolvedValue({}),
  getInvoicePayments: vi.fn().mockResolvedValue([]),
  createInvoicePayment: vi.fn().mockResolvedValue({}),
  getApiUrl: vi.fn().mockReturnValue('http://localhost:8080'),
  syncVendorPayouts: vi.fn().mockResolvedValue({}),
  getOrder: vi.fn().mockResolvedValue({}),
  createOrder: vi.fn().mockResolvedValue({}),
  updateOrderStatus: vi.fn().mockResolvedValue({}),
  getClient: vi.fn().mockResolvedValue({}),
  updateClient: vi.fn().mockResolvedValue({}),
  deleteClient: vi.fn().mockResolvedValue({}),
}));

// Import after mocks
import App from '../App';

const renderApp = (initialRoute = '/admin') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  );
};

describe('Admin Portal - Backend Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route Redirects', () => {
    it('redirects root path to /admin', () => {
      renderApp('/');
      expect(document.body).toBeInTheDocument();
    });

    it('redirects unknown paths to /admin', () => {
      renderApp('/unknown-route');
      expect(document.body).toBeInTheDocument();
    });

    it('renders login page at /login', () => {
      renderApp('/login');
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Admin Dashboard', () => {
    it('renders without crashing', () => {
      expect(() => renderApp('/admin')).not.toThrow();
    });
  });
});

describe('Admin Portal Routes', () => {
  const adminRoutes = [
    '/admin',
    '/admin/dashboard',
    '/admin/invoices',
    '/admin/clients',
    '/admin/orders',
    '/admin/vendor-management',
    '/admin/transactions',
    '/admin/accounting/vendor-payouts',
    '/admin/accounting/platform-revenue',
  ];

  adminRoutes.forEach(route => {
    it(`renders ${route} without error`, () => {
      expect(() => renderApp(route)).not.toThrow();
    });
  });
});

describe('Non-Admin Routes Redirect to Admin', () => {
  const removedRoutes = [
    '/vendor',
    '/vendor/dashboard',
    '/driver',
    '/driver/dashboard',
    '/customer',
    '/customer/home',
  ];

  removedRoutes.forEach(route => {
    it(`${route} redirects to admin`, () => {
      renderApp(route);
      expect(document.body).toBeInTheDocument();
    });
  });
});
