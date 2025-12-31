import axios from "axios";

// Use environment variable for API URL, fallback to staging ELB
// For production, set VITE_API_URL=https://api.dollor.ai
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://a25a4d0c5877a4a5898ab0352303effe-578011169.us-east-1.elb.amazonaws.com:8080';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Export for use in other files
export const getApiUrl = () => API_BASE_URL;

/**
 * Get the current vendor/user ID from localStorage.
 * Returns the ID from the stored user object or null if not authenticated.
 */
export const getCurrentVendorId = (): number | null => {
  try {
    const userData = globalThis.localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      // user.id can be string or number depending on auth method
      if (user.id) {
        return typeof user.id === 'number' ? user.id : parseInt(user.id, 10);
      }
      // Fallback to vendor_id if present
      if (user.vendor_id) {
        return typeof user.vendor_id === 'number' ? user.vendor_id : parseInt(user.vendor_id, 10);
      }
    }
  } catch (error) {
    console.error('Failed to parse user data from localStorage:', error);
  }
  return null;
};

// Add a request interceptor
api.interceptors.request.use(
  async (config) => {
    // Get the token from local storage - check multiple keys for compatibility
    // Admin uses 'token', OAuth callback uses 'id_token', drivers use 'driver_token'
    const token = globalThis.localStorage.getItem("token")
      || globalThis.localStorage.getItem("id_token")
      || globalThis.localStorage.getItem("access_token");

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
// SOC 2 Compliant: Password sent in request body, not query params
export const createVendorAccount = async (vendorId: number, password: string) => {
  const response = await api.post(`/vendors/${vendorId}/create-account`, { password });
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

// Get pre-publish checklist for a vendor (ZIP Dashboard)
export interface PublishChecklistItem {
  category: 'documents' | 'menu' | 'info';
  key: string;
  label: string;
  status: 'complete' | 'incomplete';
  url?: string;
  count?: number;
  message: string;
}

export interface PublishChecklist {
  vendor_id: number;
  restaurant_name: string;
  ready_to_publish: boolean;
  items: PublishChecklistItem[];
  summary: {
    complete: number;
    total: number;
    percentage: number;
    menu_items_count: number;
    documents_complete: number;
    documents_total: number;
  };
}

export const getVendorPublishChecklist = async (vendorId: number): Promise<PublishChecklist> => {
  const response = await api.get(`/vendors/${vendorId}/publish-checklist`);
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

// ============================================================================
// DRIVER API - Driver Portal Operations
// ============================================================================

// Driver Types
export interface DriverProfile {
  id: number;
  driver_id: string;  // Driver code (e.g., "DRV-00001")
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  phone_number?: string;  // Alias for phone (iOS compatibility)
  date_of_birth?: string;
  license_number?: string;
  photo_url?: string;
  rating: number;
  total_deliveries: number;
  status: 'pending' | 'approved' | 'active' | 'inactive' | 'suspended';
  approval_status?: string;  // Alias for status (iOS compatibility)
  is_online: boolean;
  // Vehicle info
  vehicle_type?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  license_plate?: string;
  // Documents
  drivers_license?: boolean;
  drivers_license_url?: string;
  insurance?: boolean;
  insurance_url?: string;
  background_check?: boolean;
  // Location
  latitude?: number;
  longitude?: number;
  // Timestamps
  created_at?: string;
  approved_at?: string;
}

export interface AvailableDelivery {
  id: number;
  order_id: number;
  restaurant_name: string;
  restaurant_address: string;
  customer_name: string;
  delivery_address: string;
  items_count: number;
  total_amount: number;
  delivery_fee: number;
  tip: number;
  distance_miles: number;
  estimated_minutes: number;
  priority_fee?: number;
  created_at: string;
}

export interface ActiveDeliveryData {
  id: number;
  order_id: string;  // Order number
  restaurant_name: string;
  restaurant_address: string;
  customer_name: string;
  customer_phone?: string;
  delivery_address: string;
  items_count: number;
  total_amount?: number;
  payout: number;
  distance: string;
  estimated_time: string;
  status: 'accepted' | 'picked_up' | 'delivering' | 'delivered';
  // Location coordinates
  pickup_latitude?: number;
  pickup_longitude?: number;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
}

export interface DriverDelivery {
  id: number;
  order_id: number;
  restaurant_name: string;
  customer_name: string;
  delivery_address: string;
  items_count: number;
  total_amount: number;
  payout: number;
  tip?: number;
  distance: string;
  status: 'completed' | 'in_progress' | 'cancelled';
  date: string;
  time: string;
  rating?: number;
}

/**
 * Period-based earnings breakdown - Unified structure across iOS, Android, Web
 */
export interface EarningsPeriod {
  deliveries: number;
  gross_earnings: number;
  base_pay: number;
  tips: number;
  bonuses: number;
  active_hours: number;
  effective_hourly_rate: number;
  per_delivery_average: number;
}

/**
 * Driver ratings summary
 */
export interface DriverRatings {
  average: number;
  total_ratings: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
  on_time_percentage: number;
}

/**
 * Payout/payment record
 */
export interface PayoutRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fee?: number;
}

/**
 * Daily earnings breakdown for charts
 */
export interface DailyEarning {
  day: string;
  date: string;
  deliveries: number;
  earnings: number;
  hours: number;
}

/**
 * Unified Driver Earnings Data - Aligned across iOS, Android, and Web
 * Matches backend /api/drivers/{driver_id}/earnings response
 */
export interface DriverEarningsData {
  // === Primary earnings data (for selected period) ===
  total: number;
  base_pay: number;
  tips: number;
  bonuses: number;
  previous_period: number;
  deliveries: number;
  hours_online: number;
  avg_per_delivery: number;
  hourly_rate: number;

  // === Multi-period data (for dashboard) ===
  today: EarningsPeriod;
  this_week: EarningsPeriod;
  this_month: EarningsPeriod;

  // === Daily breakdown (for charts) ===
  daily_breakdown: DailyEarning[];

  // === Ratings ===
  ratings: DriverRatings;

  // === Payout info ===
  available_balance: number;
  pending_balance: number;
  last_payout: PayoutRecord | null;

  // === Payment history ===
  payment_history: PayoutRecord[];

  // === Metadata ===
  driver_id: number;
  period: string;
  snapshot_time: string;
}

export interface DriverMessage {
  id: string;
  sender_name: string;
  sender_type: 'customer' | 'support' | 'system';
  last_message: string;
  timestamp: string;
  is_unread: boolean;
  avatar_initial: string;
}

export interface DriverDashboardData {
  driver_name: string;
  driver_id: number;
  is_online: boolean;
  rating: number;
  active_delivery: ActiveDeliveryData | null;
  pending_deliveries: AvailableDelivery[];
  today_stats: {
    deliveries: number;
    earnings: number;
    hours_online: number;
    acceptance_rate: number;
  };
  weekly_stats: {
    deliveries: { current: number; goal: number };
    earnings: { current: number; goal: number };
    hours: { current: number; goal: number };
  };
}

// Get driver token from localStorage
const getDriverToken = (): string | null => {
  return globalThis.localStorage.getItem('driver_token') || globalThis.localStorage.getItem('access_token');
};

// Get current driver ID from localStorage
export const getCurrentDriverId = (): number | null => {
  try {
    const userData = globalThis.localStorage.getItem('driver_user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.id) {
        return typeof user.id === 'number' ? user.id : parseInt(user.id, 10);
      }
      if (user.driver_id) {
        return typeof user.driver_id === 'number' ? user.driver_id : parseInt(user.driver_id, 10);
      }
    }
  } catch (error) {
    console.error('Failed to parse driver data from localStorage:', error);
  }
  return null;
};

// Driver Authentication
export const driverLogin = async (email: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await api.post('/auth/driver/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
};

export const driverRegister = async (driverData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}) => {
  const response = await api.post('/auth/driver/register', driverData);
  return response.data;
};

// Driver Dashboard
export const getDriverDashboard = async (): Promise<DriverDashboardData> => {
  const token = getDriverToken();
  const response = await api.get('/driver/dashboard', {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.data;
};

// Driver Profile
export const getDriverProfile = async (driverId: number): Promise<DriverProfile> => {
  const token = getDriverToken();
  const response = await api.get(`/erp/drivers/${driverId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.data;
};

export const updateDriverProfile = async (driverId: number, data: Partial<DriverProfile>) => {
  const token = getDriverToken();
  const response = await api.put(`/drivers/${driverId}`, data, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.data;
};

export const updateDriverOnlineStatus = async (isOnline: boolean) => {
  const token = getDriverToken();
  const response = await api.put('/auth/driver/online', null, {
    params: { is_online: isOnline },
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.data;
};

// Available Deliveries
export const getAvailableDeliveries = async (): Promise<AvailableDelivery[]> => {
  const token = getDriverToken();
  const response = await api.get('/v2/driver/deliveries/available', {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.data;
};

// Accept Delivery - uses order assign-driver endpoint
export const acceptDelivery = async (orderId: number) => {
  const token = getDriverToken();
  const driverId = getCurrentDriverId();
  const response = await api.post(`/erp/orders/${orderId}/assign-driver`,
    { driver_id: driverId },
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  return response.data;
};

// Mark Delivery as Picked Up
export const markDeliveryPickedUp = async (orderId: number) => {
  const token = getDriverToken();
  const response = await api.post(`/erp/orders/${orderId}/picked-up`, null, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.data;
};

// Complete Delivery
export const completeDelivery = async (orderId: number) => {
  const token = getDriverToken();
  const response = await api.post(`/erp/orders/${orderId}/delivered`, null, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.data;
};

// Get Driver's Deliveries History
export const getDriverDeliveries = async (driverId: number): Promise<DriverDelivery[]> => {
  const token = getDriverToken();
  try {
    const response = await api.get(`/erp/driver/${driverId}/deliveries`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return response.data || [];
  } catch {
    return [];
  }
};

// Get Active Delivery
export const getActiveDelivery = async (): Promise<ActiveDeliveryData | null> => {
  const token = getDriverToken();
  try {
    const response = await api.get('/driver/active-delivery', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return response.data;
  } catch {
    return null;
  }
};

// Driver Earnings
// Default empty earnings period
const emptyEarningsPeriod: EarningsPeriod = {
  deliveries: 0,
  gross_earnings: 0,
  base_pay: 0,
  tips: 0,
  bonuses: 0,
  active_hours: 0,
  effective_hourly_rate: 0,
  per_delivery_average: 0
};

// Default empty ratings
const emptyRatings: DriverRatings = {
  average: 0,
  total_ratings: 0,
  five_star: 0,
  four_star: 0,
  three_star: 0,
  two_star: 0,
  one_star: 0,
  on_time_percentage: 0
};

export const getDriverEarnings = async (driverId: number, period: string = 'week'): Promise<DriverEarningsData> => {
  const token = getDriverToken();
  try {
    const response = await api.get(`/drivers/${driverId}/earnings`, {
      params: { period },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return response.data;
  } catch {
    return {
      // Primary earnings data
      total: 0,
      base_pay: 0,
      tips: 0,
      bonuses: 0,
      previous_period: 0,
      deliveries: 0,
      hours_online: 0,
      avg_per_delivery: 0,
      hourly_rate: 0,
      // Multi-period data
      today: emptyEarningsPeriod,
      this_week: emptyEarningsPeriod,
      this_month: emptyEarningsPeriod,
      // Daily breakdown
      daily_breakdown: [],
      // Ratings
      ratings: emptyRatings,
      // Payout info
      available_balance: 0,
      pending_balance: 0,
      last_payout: null,
      // Payment history
      payment_history: [],
      // Metadata
      driver_id: driverId,
      period: period,
      snapshot_time: new Date().toISOString()
    };
  }
};

// Driver Messages
export const getDriverMessages = async (): Promise<DriverMessage[]> => {
  const token = getDriverToken();
  try {
    const response = await api.get('/driver/messages', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return response.data || [];
  } catch {
    return [];
  }
};

// Update Driver Location
export const updateDriverLocation = async (latitude: number, longitude: number) => {
  const token = getDriverToken();
  const response = await api.post('/driver/location', { latitude, longitude }, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.data;
};

// Driver Documents
export const getDriverDocuments = async (driverId: number) => {
  const token = getDriverToken();
  const response = await api.get(`/drivers/${driverId}/documents`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.data;
};

export const uploadDriverDocument = async (driverId: number, formData: FormData) => {
  const token = getDriverToken();
  const response = await api.post(`/drivers/${driverId}/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  return response.data;
};

// ===================== CHAT API =====================

export interface ChatMessage {
  id: number;
  sender_type: 'customer' | 'driver' | 'system';
  sender_id: number;
  sender_name?: string;
  message: string;
  message_type: string;
  attachments?: string;
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
}

export interface ChatConversation {
  id: number;
  order_id: number;
  customer_id: number;
  customer_name?: string;
  driver_id?: number;
  driver_name?: string;
  is_active: boolean;
  last_message_at?: string;
  last_message_preview?: string;
  customer_unread_count: number;
  driver_unread_count: number;
  customer_typing: boolean;
  driver_typing: boolean;
}

// Send a chat message
export const sendChatMessage = async (
  orderId: number,
  senderType: 'customer' | 'driver',
  senderId: number,
  message: string,
  senderName?: string
) => {
  const response = await api.post('/chat/send', {
    order_id: orderId,
    sender_type: senderType,
    sender_id: senderId,
    sender_name: senderName,
    message: message,
    message_type: 'text'
  });
  return response.data;
};

// Get chat messages for an order
export const getChatMessages = async (orderId: number, limit = 50, offset = 0) => {
  const response = await api.get(`/chat/messages/${orderId}`, {
    params: { limit, offset }
  });
  return response.data;
};

// Mark messages as read
export const markMessagesRead = async (
  orderId: number,
  readerType: 'customer' | 'driver',
  readerId: number
) => {
  const response = await api.post(`/chat/read/${orderId}`, null, {
    params: { reader_type: readerType, reader_id: readerId }
  });
  return response.data;
};

// Update typing indicator
export const updateTypingIndicator = async (
  orderId: number,
  senderType: 'customer' | 'driver',
  senderId: number,
  isTyping: boolean
) => {
  const response = await api.post(`/chat/typing/${orderId}`, {
    sender_type: senderType,
    sender_id: senderId,
    is_typing: isTyping
  });
  return response.data;
};

// Get conversation info for an order
export const getChatConversation = async (orderId: number) => {
  const response = await api.get(`/chat/conversation/${orderId}`);
  return response.data;
};

// Get driver's conversations list
export const getDriverConversations = async (driverId: number, activeOnly = true) => {
  const response = await api.get(`/chat/driver/${driverId}/conversations`, {
    params: { active_only: activeOnly }
  });
  return response.data;
};

// Get customer's conversations list
export const getCustomerConversations = async (customerId: number, activeOnly = true) => {
  const response = await api.get(`/chat/customer/${customerId}/conversations`, {
    params: { active_only: activeOnly }
  });
  return response.data;
};

// ===================== RIDE BIDDING API =====================

// Types for ride bidding
export interface RideRequest {
  id: number;
  request_id: string;
  customer_id: number;
  customer_name: string;
  pickup: {
    address: string;
    latitude: number;
    longitude: number;
    place_name?: string;
  };
  dropoff: {
    address: string;
    latitude: number;
    longitude: number;
    place_name?: string;
  };
  estimated_distance_km: number;
  estimated_duration_minutes: number;
  ride_type: string;
  suggested_price: number;
  customer_max_price?: number;
  customer_preferred_price?: number;
  final_price?: number;
  status: 'open' | 'bidding' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  bidding_expires_at?: string;
  special_requests?: string;
  created_at: string;
  matched_at?: string;
  bid_count: number;
  bids?: RideBid[];
  distance_to_pickup_km?: number;
  already_bid?: boolean;
  my_bid?: RideBid;
  matched_driver?: {
    id: number;
    name: string;
  };
}

export interface RideBid {
  id: number;
  bid_id: string;
  ride_request_id: number;
  driver_id: number;
  driver_name: string;
  driver_rating: number;
  driver_photo_url?: string;
  driver_vehicle: string;
  proposed_price: number;
  message?: string;
  estimated_arrival_minutes?: number;
  is_counter_offer: boolean;
  original_price?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn' | 'expired';
  customer_response?: string;
  customer_counter_price?: number;
  expires_at?: string;
  created_at: string;
  ride_request?: RideRequest;
}

// Customer creates a ride request for bidding
export const createRideRequest = async (data: {
  customer_id: number;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_place_name?: string;
  dropoff_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  dropoff_place_name?: string;
  ride_type?: string;
  customer_max_price?: number;
  customer_preferred_price?: number;
  special_requests?: string;
  bidding_duration_minutes?: number;
}) => {
  const response = await api.post('/rides/request', data);
  return response.data;
};

// Get ride request details with bids
export const getRideRequest = async (requestId: number) => {
  const response = await api.get(`/rides/request/${requestId}`);
  return response.data;
};

// Get customer's ride requests
export const getCustomerRideRequests = async (customerId: number, status?: string) => {
  const response = await api.get(`/rides/customer/${customerId}/requests`, {
    params: { status }
  });
  return response.data;
};

// Get all bids for a ride request
export const getBidsForRequest = async (requestId: number) => {
  const response = await api.get(`/rides/request/${requestId}/bids`);
  return response.data;
};

// Customer responds to a bid (accept/reject/counter)
export const respondToBid = async (
  bidId: number,
  action: 'accept' | 'reject' | 'counter',
  counterPrice?: number,
  message?: string
) => {
  const response = await api.post(`/rides/bid/${bidId}/respond`, {
    action,
    counter_price: counterPrice,
    message
  });
  return response.data;
};

// Customer cancels ride request
export const cancelRideRequest = async (requestId: number) => {
  const response = await api.post(`/rides/request/${requestId}/cancel`);
  return response.data;
};

// Driver: Get available ride requests for bidding
export const getAvailableRideRequests = async (
  driverId: number,
  latitude: number,
  longitude: number,
  radiusKm = 15
) => {
  const response = await api.get('/rides/available', {
    params: {
      driver_id: driverId,
      latitude,
      longitude,
      radius_km: radiusKm
    }
  });
  return response.data;
};

// Driver submits a bid
export const submitBid = async (
  requestId: number,
  driverId: number,
  proposedPrice: number,
  message?: string,
  estimatedArrivalMinutes?: number
) => {
  const response = await api.post(`/rides/request/${requestId}/bid`, {
    driver_id: driverId,
    proposed_price: proposedPrice,
    message,
    estimated_arrival_minutes: estimatedArrivalMinutes
  });
  return response.data;
};

// Driver updates their bid
export const updateBid = async (
  bidId: number,
  proposedPrice: number,
  message?: string
) => {
  const response = await api.put(`/rides/bid/${bidId}`, {
    proposed_price: proposedPrice,
    message
  });
  return response.data;
};

// Driver withdraws their bid
export const withdrawBid = async (bidId: number) => {
  const response = await api.post(`/rides/bid/${bidId}/withdraw`);
  return response.data;
};

// Driver accepts customer's counter-offer
export const acceptCounterOffer = async (bidId: number) => {
  const response = await api.post(`/rides/bid/${bidId}/accept-counter`);
  return response.data;
};

// Driver rejects customer's counter-offer
export const rejectCounterOffer = async (bidId: number) => {
  const response = await api.post(`/rides/bid/${bidId}/reject-counter`);
  return response.data;
};

// Get driver's bids
export const getDriverBids = async (driverId: number, status?: string) => {
  const response = await api.get(`/rides/driver/${driverId}/bids`, {
    params: { status }
  });
  return response.data;
};

// Start a matched ride
export const startRide = async (requestId: number) => {
  const response = await api.post(`/rides/request/${requestId}/start`);
  return response.data;
};

// Complete a ride
export const completeRide = async (requestId: number) => {
  const response = await api.post(`/rides/request/${requestId}/complete`);
  return response.data;
};

// ===================== WEBSOCKET HELPERS =====================

export const getWebSocketUrl = () => {
  const baseUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  return `${baseUrl}/api/realtime/ws`;
};

export default api;