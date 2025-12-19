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

// Vendors API
export const getVendors = async () => {
  const response = await api.get('/vendors');
  return response.data;
};

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