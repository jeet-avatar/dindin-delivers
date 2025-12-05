import { Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './app/context/UserContext';
import Login from './app/screens/auth/Login';
import VendorLogin from './app/screens/auth/VendorLogin';
import DriverLogin from './app/screens/auth/DriverLogin';
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
import MainLayout from './app/components/layout/MainLayout';
import VendorLayout from './app/components/layout/VendorLayout';
import DriverLayout from './app/components/layout/DriverLayout';
import VendorDashboard from './app/screens/vendor/Dashboard';
import VendorMenuManagement from './app/screens/vendor/MenuManagement';
import VendorEarnings from './app/screens/vendor/Earnings';
import VendorDocuments from './app/screens/vendor/Documents';
import VendorSettings from './app/screens/vendor/Settings';
import DriverDashboard from './app/screens/driver/Dashboard';
import DriverDeliveries from './app/screens/driver/Deliveries';
import DriverEarnings from './app/screens/driver/Earnings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  
  // Temporarily disable auth requirement to access old UI
  // if (!user) {
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

        {/* Public Application Routes */}
        <Route path="/restaurant/apply" element={<RestaurantApplication />} />
        <Route path="/driver/apply" element={<DriverApplication />} />

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

        {/* Catch-all redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserProvider>
  );
}

export default App;