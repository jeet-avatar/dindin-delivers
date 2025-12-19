import { Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './app/context/UserContext';
import Login from './app/screens/auth/Login';
import VendorLogin from './app/screens/auth/VendorLogin';
import DriverLogin from './app/screens/auth/DriverLogin';
import CustomerLogin from './app/screens/auth/CustomerLogin';
import ForgotPassword from './app/screens/auth/ForgotPassword';
import Dashboard from './app/screens/dashboard/Main';
import SystemDashboard from './app/screens/dashboard/Main';
import CoupaDashboard from './app/screens/coupaDashboard/Main';
import NetsuiteDashboard from './app/screens/netsuiteDashboard/Main';
import JiraDashboard from './app/screens/jiraDashboard/Main';
import ZipDashboard from './app/screens/zipDashboard/Main';
import VendorManagement from './app/screens/vendorManagement/Main';
import Transactions from './app/screens/transactions/Main';
import Invoices from './app/screens/invoices/Invoices';
import Clients from './app/screens/clients/Clients';
import Orders from './app/screens/orders/Main';
import VendorPayouts from './app/screens/accounting/VendorPayouts';
import PlatformRevenue from './app/screens/accounting/PlatformRevenue';
import LandingPage from './app/screens/public/LandingPage';
import RestaurantApplication from './app/screens/public/RestaurantApplication';
import DriverApplication from './app/screens/public/DriverApplication';
import TermsOfService from './app/screens/public/TermsOfService';
import PrivacyPolicy from './app/screens/public/PrivacyPolicy';
import HelpSupport from './app/screens/public/HelpSupport';
import ReferAndEarn from './app/screens/public/ReferAndEarn';
import MainLayout from './app/components/layout/MainLayout';
import VendorLayout from './app/components/layout/VendorLayout';
import DriverLayout from './app/components/layout/DriverLayout';
import CustomerLayout from './app/components/layout/CustomerLayout';
import VendorDashboard from './app/screens/vendor/Dashboard';
import VendorMenuManagement from './app/screens/vendor/MenuManagement';
import VendorEarnings from './app/screens/vendor/Earnings';
import VendorDocuments from './app/screens/vendor/Documents';
import VendorSettings from './app/screens/vendor/Settings';
import DriverDashboard from './app/screens/driver/Dashboard';
import DriverDeliveries from './app/screens/driver/Deliveries';
import DriverEarnings from './app/screens/driver/Earnings';
import CustomerDashboard from './app/screens/customer/Dashboard';
import CustomerHome from './app/screens/customer/CustomerHome';
import RideBooking from './app/screens/customer/RideBooking';
import Restaurants from './app/screens/customer/Restaurants';
import RestaurantDetail from './app/screens/customer/RestaurantDetail';
import Cart from './app/screens/customer/Cart';
import Checkout from './app/screens/customer/Checkout';
import OrderTracking from './app/screens/customer/OrderTracking';
import DealsPage from './app/screens/customer/DealsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user: _user } = useUser();

  // Temporarily disable auth requirement to access old UI
  // if (!_user) {
  //   return <Navigate to="/login" replace />;
  // }

  return <>{children}</>;
}

function App() {
  return (
    <UserProvider>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/driver/login" element={<DriverLogin />} />
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ForgotPassword />} />

        {/* Standalone Ride Booking (no auth required for quick access) */}
        <Route path="/ride" element={<RideBooking />} />

        {/* Public Application Routes */}
        <Route path="/restaurant/apply" element={<RestaurantApplication />} />
        <Route path="/driver/apply" element={<DriverApplication />} />

        {/* Legal Pages */}
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />

        {/* Help & Support */}
        <Route path="/help" element={<HelpSupport />} />
        <Route path="/support" element={<HelpSupport />} />

        {/* Referral Program */}
        <Route path="/refer" element={<ReferAndEarn />} />
        <Route path="/referral" element={<ReferAndEarn />} />

        {/* Admin/Business Portal Routes */}
        <Route path="/admin" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="system-dashboard" element={<SystemDashboard />} />
          <Route path="coupa-dashboard" element={<CoupaDashboard />} />
          <Route path="netsuite-dashboard" element={<NetsuiteDashboard />} />
          <Route path="jira-dashboard" element={<JiraDashboard />} />
          <Route path="zip-dashboard" element={<ZipDashboard />} />
          <Route path="vendor-management" element={<VendorManagement />} />
          <Route path="transactions/*" element={<Transactions />} />
          <Route path="orders" element={<Orders />} />
          <Route path="accounting/vendor-payouts" element={<VendorPayouts />} />
          <Route path="accounting/platform-revenue" element={<PlatformRevenue />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="clients" element={<Clients />} />
        </Route>

        {/* Restaurant/Vendor Portal Routes */}
        <Route path="/vendor" element={<VendorLayout />}>
          <Route index element={<Navigate to="/vendor/dashboard" replace />} />
          <Route path="dashboard" element={<VendorDashboard />} />
          <Route path="menu" element={<VendorMenuManagement />} />
          <Route path="earnings" element={<VendorEarnings />} />
          <Route path="documents" element={<VendorDocuments />} />
          <Route path="settings" element={<VendorSettings />} />
        </Route>

        {/* Driver Portal Routes */}
        <Route path="/driver" element={<DriverLayout />}>
          <Route index element={<Navigate to="/driver/dashboard" replace />} />
          <Route path="dashboard" element={<DriverDashboard />} />
          <Route path="deliveries" element={<DriverDeliveries />} />
          <Route path="earnings" element={<DriverEarnings />} />
        </Route>

        {/* Customer/Rider Portal Routes */}
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<Navigate to="/customer/home" replace />} />
          <Route path="home" element={<CustomerHome />} />
          <Route path="dashboard" element={<CustomerHome />} />
          <Route path="ride" element={<RideBooking />} />
          <Route path="restaurants" element={<Restaurants />} />
          <Route path="restaurant/:id" element={<RestaurantDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-tracking" element={<OrderTracking />} />
          <Route path="order-tracking/:orderId" element={<OrderTracking />} />
          <Route path="history" element={<CustomerDashboard />} />
          <Route path="wallet" element={<CustomerDashboard />} />
          <Route path="promotions" element={<DealsPage />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="support" element={<HelpSupport />} />
          <Route path="settings" element={<CustomerDashboard />} />
        </Route>

        {/* Catch-all redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserProvider>
  );
}

export default App;