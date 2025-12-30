import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './app/context/UserContext';
import Login from './app/screens/auth/Login';
import ForgotPassword from './app/screens/auth/ForgotPassword';
import Dashboard from './app/screens/dashboard/Main';
import CoupaDashboard from './app/screens/coupaDashboard/Main';
import NetsuiteDashboard from './app/screens/netsuiteDashboard/Main';
import JiraDashboard from './app/screens/jiraDashboard/Main';
import ZipDashboard from './app/screens/zipDashboard/Main';
import VendorManagement from './app/screens/vendorManagement/Main';
import DocumentReview from './app/screens/vendorManagement/DocumentReview';
import MenuReview from './app/screens/vendorManagement/MenuReview';
import Transactions from './app/screens/transactions/Main';
import Invoices from './app/screens/invoices/Invoices';
import Clients from './app/screens/clients/Clients';
import Orders from './app/screens/orders/Main';
import VendorPayouts from './app/screens/accounting/VendorPayouts';
import PlatformRevenue from './app/screens/accounting/PlatformRevenue';
import MainLayout from './app/components/layout/MainLayout';

// Public Pages
import LandingPage from './app/screens/public/LandingPage';
import TermsOfService from './app/screens/public/TermsOfService';
import PrivacyPolicy from './app/screens/public/PrivacyPolicy';
import RestaurantApplication from './app/screens/public/RestaurantApplication';
import DriverApplication from './app/screens/public/DriverApplication';
import HelpSupport from './app/screens/public/HelpSupport';
import ReferAndEarn from './app/screens/public/ReferAndEarn';

// Customer Pages
import CustomerLogin from './app/screens/auth/CustomerLogin';
import CustomerHome from './app/screens/customer/CustomerHome';
import CustomerProfile from './app/screens/customer/CustomerProfile';
import Restaurants from './app/screens/customer/Restaurants';
import RestaurantDetail from './app/screens/customer/RestaurantDetail';
import Cart from './app/screens/customer/Cart';
import Checkout from './app/screens/customer/Checkout';
import OrderTracking from './app/screens/customer/OrderTracking';
import RideBooking from './app/screens/customer/RideBooking';
import DealsPage from './app/screens/customer/DealsPage';

// Vendor Pages
import VendorLogin from './app/screens/auth/VendorLogin';
import VendorProfile from './app/screens/vendor/Profile';

// Driver Pages
import DriverLogin from './app/screens/auth/DriverLogin';
import DriverLayout from './app/components/layout/DriverLayout';
import AvailableOrders from './app/screens/driver/AvailableOrders';
import ActiveDelivery from './app/screens/driver/ActiveDelivery';
import DriverDeliveries from './app/screens/driver/Deliveries';
import DriverMessages from './app/screens/driver/Messages';
import DriverProfile from './app/screens/driver/Profile';
import DriverDashboard from './app/screens/driver/Dashboard';
import DriverEarnings from './app/screens/driver/Earnings';
import RideBidding from './app/screens/driver/RideBidding';
import RideBids from './app/screens/customer/RideBids';

/**
 * DOLLOR.AI WEB APPLICATION
 *
 * Routes:
 * - / : Public landing page
 * - /customer/* : Customer ordering and ride booking
 * - /vendor/* : Restaurant portal
 * - /driver/* : Driver portal
 * - /admin/* : Admin backend operations
 *
 * See CLAUDE.md for full documentation.
 */

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  // Wait for auth check to complete before making decisions
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>🔐</div>
          <div>Verifying authentication...</div>
        </div>
      </div>
    );
  }

  // Authentication required for admin routes
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verify admin role
  if (user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Pages */}
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/help" element={<HelpSupport />} />
        <Route path="/support" element={<HelpSupport />} />
        <Route path="/refer" element={<ReferAndEarn />} />
        <Route path="/referral" element={<ReferAndEarn />} />

        {/* Restaurant & Driver Applications */}
        <Route path="/restaurant/apply" element={<RestaurantApplication />} />
        <Route path="/driver/apply" element={<DriverApplication />} />

        {/* Customer Routes */}
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/customer" element={<CustomerHome />} />
        <Route path="/customer/home" element={<CustomerHome />} />
        <Route path="/customer/dashboard" element={<CustomerHome />} />
        <Route path="/customer/restaurants" element={<Restaurants />} />
        <Route path="/customer/restaurant/:id" element={<RestaurantDetail />} />
        <Route path="/customer/cart" element={<Cart />} />
        <Route path="/customer/checkout" element={<Checkout />} />
        <Route path="/customer/order/:orderId" element={<OrderTracking />} />
        <Route path="/customer/order-tracking" element={<OrderTracking />} />
        <Route path="/customer/rides" element={<RideBooking />} />
        <Route path="/customer/ride" element={<RideBooking />} />
        <Route path="/customer/ride-bids" element={<RideBids customerId={1} />} />
        <Route path="/customer/ride-bids/:requestId" element={<RideBids customerId={1} />} />
        <Route path="/customer/deals" element={<DealsPage />} />
        <Route path="/customer/search" element={<Restaurants />} />
        <Route path="/customer/address" element={<CustomerHome />} />
        <Route path="/customer/profile" element={<CustomerProfile />} />
        <Route path="/customer/history" element={<OrderTracking />} />

        {/* Vendor Routes */}
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/vendor/profile" element={<VendorProfile />} />
        <Route path="/vendor/settings" element={<VendorProfile />} />
        <Route path="/vendor/dashboard" element={<VendorProfile />} />

        {/* Driver Routes - Aligned with iOS DriverDashboardView tabs */}
        <Route path="/driver/login" element={<DriverLogin />} />
        <Route path="/driver" element={<DriverLayout />}>
          <Route index element={<AvailableOrders />} />
          <Route path="orders" element={<AvailableOrders />} />
          <Route path="bidding" element={<RideBidding />} />
          <Route path="active" element={<ActiveDelivery />} />
          <Route path="history" element={<DriverDeliveries />} />
          <Route path="messages" element={<DriverMessages />} />
          <Route path="profile" element={<DriverProfile />} />
          <Route path="dashboard" element={<DriverDashboard />} />
          <Route path="earnings" element={<DriverEarnings />} />
        </Route>

        {/* Admin Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin Portal - Backend Operations */}
        <Route path="/admin" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="coupa-dashboard" element={<CoupaDashboard />} />
          <Route path="netsuite-dashboard" element={<NetsuiteDashboard />} />
          <Route path="jira-dashboard" element={<JiraDashboard />} />
          <Route path="zip-dashboard" element={<ZipDashboard />} />
          <Route path="vendor-management" element={<VendorManagement />} />
          <Route path="document-review" element={<DocumentReview />} />
          <Route path="menu-review" element={<MenuReview />} />
          <Route path="transactions/*" element={<Transactions />} />
          <Route path="orders" element={<Orders />} />
          <Route path="accounting/vendor-payouts" element={<VendorPayouts />} />
          <Route path="accounting/platform-revenue" element={<PlatformRevenue />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="clients" element={<Clients />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
