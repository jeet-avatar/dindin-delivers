import { Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './app/context/UserContext';
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

/**
 * ADMIN PORTAL - BACKEND OPERATIONS ONLY
 *
 * This is the only UI for Dollor.ai backend operations.
 * All admin, invoicing, accounting, and management tasks are done here.
 *
 * See CLAUDE.md for full documentation.
 */

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user: _user } = useUser();

  // TODO: Enable auth requirement for production
  // if (!_user) {
  //   return <Navigate to="/login" replace />;
  // }

  return <>{children}</>;
}

function App() {
  return (
    <UserProvider>
      <Routes>
        {/* Auth Routes */}
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

        {/* Default redirect to admin dashboard */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </UserProvider>
  );
}

export default App;
