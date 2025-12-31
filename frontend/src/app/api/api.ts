import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.dollor.ai';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

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
export const getOrders = async (params?: any) => {
  const response = await api.get('/orders', { params });
  return response.data;
};

export const getOrder = async (orderId: number) => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data;
};

export const createOrder = async (orderData: any) => {
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
    totalRevenue: orders.reduce((sum: number, order: any) => 
      order.payment_status === 'succeeded' ? sum + order.total_amount : sum, 0
    ),
    pendingOrders: orders.filter((o: any) => 
      o.status === 'pending_payment' || o.status === 'confirmed' || o.status === 'preparing'
    ).length,
    completedOrders: orders.filter((o: any) => o.status === 'delivered').length
  };
  
  return stats;
};

// Vendor Payouts API
export const getVendorPayouts = async (params?: any) => {
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

export default api;