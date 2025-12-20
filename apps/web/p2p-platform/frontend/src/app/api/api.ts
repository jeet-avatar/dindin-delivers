import axios from "axios";

// Use environment variable for API URL, fallback to staging ELB
// For production, set VITE_API_URL=https://api.dollor.ai
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://a25a4d0c5877a4a5898ab0352303effe-578011169.us-east-1.elb.amazonaws.com:8080';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Export for use in other files
export const getApiUrl = () => API_BASE_URL;

// Add a request interceptor
api.interceptors.request.use(
  async (config) => {
    // Get the token from local storage
    const token = globalThis.localStorage.getItem("id_token");

    // If the token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Do something with request error
    return Promise.reject(error instanceof Error ? error : new Error(error));
  }
);

// Orders API
export const getOrders = async (params?: Record<string, unknown>) => {
  const response = await api.get('/orders', { params });
  return response.data;
};

export const getOrder = async (orderId: number) => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data;
};

export const createOrder = async (orderData: Record<string, unknown>) => {
  const response = await api.post('/orders', orderData);
  return response.data;
};

export const updateOrderStatus = async (orderId: number, status: string) => {
  const response = await api.patch(`/orders/${orderId}/status`, { status });
  return response.data;
};

export const getOrderStats = async () => {
  const response = await api.get('/orders');
  const orders = response.data;
  
  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum: number, order: { payment_status: string; total_amount: number }) =>
      order.payment_status === 'succeeded' ? sum + order.total_amount : sum, 0
    ),
    pendingOrders: orders.filter((o: { status: string }) =>
      o.status === 'pending_payment' || o.status === 'confirmed' || o.status === 'preparing'
    ).length,
    completedOrders: orders.filter((o: { status: string }) => o.status === 'delivered').length
  };
  
  return stats;
};

// Vendor Payouts API
export const getVendorPayouts = async (params?: Record<string, unknown>) => {
  const response = await api.get('/accounting/vendor-payouts', { params });
  return response.data;
};

export const syncVendorPayouts = async (periodStart: string, periodEnd: string) => {
  const response = await api.post('/accounting/sync-vendor-payouts', {
    period_start: periodStart,
    period_end: periodEnd
  });
  return response.data;
};

// ============================================================================
// VENDOR/RESTAURANT API - ZIP Vendor Approval System
// ============================================================================

// Vendor Types
export interface VendorDocument {
  id?: number;
  vendor_id: number;
  document_type: string;
  file_url: string;
  file_name: string;
  uploaded_at?: string;
  expiry_date?: string;
  verified?: boolean;
  verified_at?: string;
  verified_by?: string;
}

export interface Vendor {
  id: number;
  restaurant_name?: string;
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  cuisine_type?: string;
  description?: string;
  onboarding_status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'suspended';
  onboarding_phase: 'not_started' | 'documents_pending' | 'under_review' | 'compliance_check' | 'completed';
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
  last_activity?: string;
  // Document URLs
  food_license?: string;
  food_license_url?: string;
  health_permit?: string;
  health_permit_url?: string;
  w9_form?: string;
  w9_form_url?: string;
  insurance?: string;
  insurance_url?: string;
  // Additional fields
  ein_number?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  delivery_enabled?: boolean;
  minimum_order?: number;
  delivery_fee?: number;
  // Publishing status (for mobile apps)
  is_published?: boolean;
  published_at?: string;
  published_platforms?: string; // JSON array: ["ios", "android", "web"]
}

// Get all vendors (with optional status filter) - Admin use
export const getVendors = async (params?: { status?: string; search?: string }) => {
  const response = await api.get('/vendors', { params });
  return response.data;
};

// Get published vendors for customer-facing apps (web, ios, android)
// Returns only approved and published restaurants
export const getPublishedVendors = async (platform: 'ios' | 'android' | 'web' | 'all' = 'web') => {
  const response = await api.get('/vendors/published', { params: { platform } });
  return response.data;
};

// Get single vendor by ID
export const getVendor = async (vendorId: number) => {
  const response = await api.get(`/vendors/${vendorId}`);
  return response.data;
};

// Create new vendor (admin)
export const createVendor = async (vendorData: Partial<Vendor>) => {
  const response = await api.post('/vendors', vendorData);
  return response.data;
};

// Update vendor
export const updateVendor = async (vendorId: number, vendorData: Partial<Vendor>) => {
  const response = await api.put(`/vendors/${vendorId}`, vendorData);
  return response.data;
};

// Patch vendor (partial update)
export const patchVendor = async (vendorId: number, vendorData: Partial<Vendor>) => {
  const response = await api.patch(`/vendors/${vendorId}`, vendorData);
  return response.data;
};

// Update vendor status (approve/reject/suspend)
export const updateVendorStatus = async (
  vendorId: number,
  status: string,
  skipDocumentCheck: boolean = false
) => {
  const response = await api.patch(`/vendors/${vendorId}/status`, null, {
    params: { status, skip_document_check: skipDocumentCheck }
  });
  return response.data;
};

// Delete vendor
export const deleteVendor = async (vendorId: number) => {
  const response = await api.delete(`/vendors/${vendorId}`);
  return response.data;
};

// Get vendor documents
export const getVendorDocuments = async (vendorId: number) => {
  const response = await api.get(`/vendors/${vendorId}/documents`);
  return response.data;
};

// Upload vendor document
export const uploadVendorDocument = async (vendorId: number, formData: FormData) => {
  const response = await api.post(`/vendors/${vendorId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// Delete vendor document
export const deleteVendorDocument = async (vendorId: number, documentId: number) => {
  const response = await api.delete(`/vendors/${vendorId}/documents/${documentId}`);
  return response.data;
};

// Update vendor documents (mark as verified)
export const updateVendorDocuments = async (vendorId: number, documents: Partial<VendorDocument>[]) => {
  const response = await api.patch(`/vendors/${vendorId}/documents`, documents);
  return response.data;
};

// Create vendor user account (admin)
export const createVendorAccount = async (vendorId: number, password: string) => {
  const response = await api.post(`/vendors/${vendorId}/create-account`, null, {
    params: { password }
  });
  return response.data;
};

// Get vendor menu
export const getVendorMenu = async (vendorId: number) => {
  const response = await api.get(`/vendors/${vendorId}/menu`);
  return response.data;
};

// Get vendor statistics for ZIP dashboard
export const getVendorStats = async () => {
  try {
    const vendors = await getVendors();

    const stats = {
      totalVendors: vendors.length,
      activeVendors: vendors.filter((v: Vendor) => v.onboarding_status === 'approved').length,
      pendingApproval: vendors.filter((v: Vendor) =>
        v.onboarding_status === 'pending' || v.onboarding_status === 'in_review'
      ).length,
      inOnboarding: vendors.filter((v: Vendor) =>
        v.onboarding_phase !== 'not_started' && v.onboarding_phase !== 'completed'
      ).length,
      rejectedApplications: vendors.filter((v: Vendor) => v.onboarding_status === 'rejected').length,
      suspendedVendors: vendors.filter((v: Vendor) => v.onboarding_status === 'suspended').length,
      completedOnboarding: vendors.filter((v: Vendor) => v.onboarding_phase === 'completed').length,
      byStatus: {
        pending: vendors.filter((v: Vendor) => v.onboarding_status === 'pending').length,
        in_review: vendors.filter((v: Vendor) => v.onboarding_status === 'in_review').length,
        approved: vendors.filter((v: Vendor) => v.onboarding_status === 'approved').length,
        rejected: vendors.filter((v: Vendor) => v.onboarding_status === 'rejected').length,
        suspended: vendors.filter((v: Vendor) => v.onboarding_status === 'suspended').length,
      },
      byPhase: {
        not_started: vendors.filter((v: Vendor) => v.onboarding_phase === 'not_started').length,
        documents_pending: vendors.filter((v: Vendor) => v.onboarding_phase === 'documents_pending').length,
        under_review: vendors.filter((v: Vendor) => v.onboarding_phase === 'under_review').length,
        compliance_check: vendors.filter((v: Vendor) => v.onboarding_phase === 'compliance_check').length,
        completed: vendors.filter((v: Vendor) => v.onboarding_phase === 'completed').length,
      }
    };

    return stats;
  } catch (error) {
    console.error('Failed to fetch vendor stats:', error);
    return {
      totalVendors: 0,
      activeVendors: 0,
      pendingApproval: 0,
      inOnboarding: 0,
      rejectedApplications: 0,
      suspendedVendors: 0,
      completedOnboarding: 0,
      byStatus: { pending: 0, in_review: 0, approved: 0, rejected: 0, suspended: 0 },
      byPhase: { not_started: 0, documents_pending: 0, under_review: 0, compliance_check: 0, completed: 0 }
    };
  }
};

// Required documents for vendor approval (ZIP compliance)
export const REQUIRED_VENDOR_DOCUMENTS = [
  { key: 'food_license', label: 'Food Service License', description: 'State/local food service license', required: true },
  { key: 'health_permit', label: 'Health Department Permit', description: 'Current health permit', required: true },
  { key: 'w9_form', label: 'Business License / W-9 Form', description: 'IRS W-9 tax form', required: true },
  { key: 'insurance', label: 'Liability Insurance', description: 'General liability insurance certificate', required: true },
];

// ============================================================================
// INVOICE API - Connected to Admin Portal
// ============================================================================

// Invoice CRUD
export const getInvoices = async (params?: Record<string, unknown>) => {
  const response = await api.get('/invoices', { params });
  return response.data;
};

export const getInvoice = async (invoiceId: number) => {
  const response = await api.get(`/invoices/${invoiceId}`);
  return response.data;
};

export const createInvoice = async (invoiceData: Record<string, unknown>) => {
  const response = await api.post('/invoices', invoiceData);
  return response.data;
};

export const updateInvoice = async (invoiceId: number, invoiceData: Record<string, unknown>) => {
  const response = await api.put(`/invoices/${invoiceId}`, invoiceData);
  return response.data;
};

export const deleteInvoice = async (invoiceId: number) => {
  const response = await api.delete(`/invoices/${invoiceId}`);
  return response.data;
};

// Invoice Actions
export const sendInvoice = async (invoiceId: number) => {
  const response = await api.post(`/invoices/${invoiceId}/send`);
  return response.data;
};

export const markInvoicePaid = async (invoiceId: number, paymentData?: Record<string, unknown>) => {
  const response = await api.post(`/invoices/${invoiceId}/mark-paid`, paymentData || {});
  return response.data;
};

export const duplicateInvoice = async (invoiceId: number) => {
  const response = await api.post(`/invoices/${invoiceId}/duplicate`);
  return response.data;
};

export const voidInvoice = async (invoiceId: number, reason?: string) => {
  const response = await api.post(`/invoices/${invoiceId}/void`, { reason });
  return response.data;
};

// Invoice Items
export const addInvoiceItem = async (invoiceId: number, itemData: Record<string, unknown>) => {
  const response = await api.post(`/invoices/${invoiceId}/items`, itemData);
  return response.data;
};

export const updateInvoiceItem = async (invoiceId: number, itemId: number, itemData: Record<string, unknown>) => {
  const response = await api.put(`/invoices/${invoiceId}/items/${itemId}`, itemData);
  return response.data;
};

export const deleteInvoiceItem = async (invoiceId: number, itemId: number) => {
  const response = await api.delete(`/invoices/${invoiceId}/items/${itemId}`);
  return response.data;
};

// Invoice Payments
export const getInvoicePayments = async (invoiceId: number) => {
  const response = await api.get(`/invoices/${invoiceId}/payments`);
  return response.data;
};

export const createInvoicePayment = async (invoiceId: number, paymentData: Record<string, unknown>) => {
  const response = await api.post(`/invoices/${invoiceId}/payments`, paymentData);
  return response.data;
};

// Invoice Stats
export const getInvoiceStats = async () => {
  const response = await api.get('/invoices/stats');
  return response.data;
};

// ============================================================================
// CLIENT API - Connected to Admin Portal
// ============================================================================

export const getClients = async () => {
  const response = await api.get('/clients');
  return response.data;
};

export const getClient = async (clientId: number) => {
  const response = await api.get(`/clients/${clientId}`);
  return response.data;
};

export const createClient = async (clientData: Record<string, unknown>) => {
  const response = await api.post('/clients', clientData);
  return response.data;
};

export const updateClient = async (clientId: number, clientData: Record<string, unknown>) => {
  const response = await api.put(`/clients/${clientId}`, clientData);
  return response.data;
};

export const deleteClient = async (clientId: number) => {
  const response = await api.delete(`/clients/${clientId}`);
  return response.data;
};

export default api;