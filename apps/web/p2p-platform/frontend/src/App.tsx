import { Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './app/context/UserContext';
import Login from './app/screens/auth/Login';
import VendorLogin from './app/screens/auth/VendorLogin';
import DriverLogin from './app/screens/auth/DriverLogin';
import CustomerLogin from './app/screens/auth/CustomerLogin';
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
import RideBooking from './app/screens/customer/RideBooking';

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
          <Route index element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="ride" element={<RideBooking />} />
          <Route path="history" element={<CustomerDashboard />} />
          <Route path="wallet" element={<CustomerDashboard />} />
          <Route path="promotions" element={<CustomerDashboard />} />
          <Route path="support" element={<CustomerDashboard />} />
          <Route path="settings" element={<CustomerDashboard />} />
        </Route>

        {/* Catch-all redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserProvider>
  );
}

export default App;