import { Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './app/context/UserContext';
import Login from './app/screens/auth/Login';
import VendorLogin from './app/screens/auth/VendorLogin';
import Dashboard from './app/screens/dashboard/Main';
import SystemDashboard from './app/screens/dashboard/Main';
import CoupaDashboard from './app/screens/coupaDashboard/Main';
import NetsuiteDashboard from './app/screens/netsuiteDashboard/Main';
import JiraDashboard from './app/screens/jiraDashboard/Main';
import ZipDashboard from './app/screens/zipDashboard/Main';
import VendorManagement from './app/screens/vendorManagement/Main';
import Transactions from './app/screens/transactions/Main';
import CoupaTransactions from './app/screens/transactions/CoupaTransactions';
import NetSuiteTransactions from './app/screens/transactions/NetSuiteTransactions';
import Invoices from './app/screens/invoices/Invoices';
import Clients from './app/screens/clients/Clients';
import Orders from './app/screens/orders/Main';
import VendorPayouts from './app/screens/accounting/VendorPayouts';
import RestaurantApplication from './app/screens/public/RestaurantApplication';
import MainLayout from './app/components/layout/MainLayout';
import VendorLayout from './app/components/layout/VendorLayout';
import VendorDashboard from './app/screens/vendor/Dashboard';
import VendorMenuManagement from './app/screens/vendor/MenuManagement';
import VendorEarnings from './app/screens/vendor/Earnings';
import VendorDocuments from './app/screens/vendor/Documents';
import VendorSettings from './app/screens/vendor/Settings';

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
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/restaurant/apply" element={<RestaurantApplication />} />
        
        {/* Admin Routes */}
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="system-dashboard" element={<SystemDashboard />} />
          <Route path="coupa-dashboard" element={<CoupaDashboard />} />
          <Route path="netsuite-dashboard" element={<NetsuiteDashboard />} />
          <Route path="jira-dashboard" element={<JiraDashboard />} />
          <Route path="zip-dashboard" element={<ZipDashboard />} />
          <Route path="vendor-management" element={<VendorManagement />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="transactions/coupa" element={<CoupaTransactions />} />
          <Route path="transactions/netsuite" element={<NetSuiteTransactions />} />
          <Route path="orders" element={<Orders />} />
          <Route path="accounting/vendor-payouts" element={<VendorPayouts />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="clients" element={<Clients />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Vendor Routes */}
        <Route path="/vendor" element={<VendorLayout />}>
          <Route path="dashboard" element={<VendorDashboard />} />
          <Route path="menu" element={<VendorMenuManagement />} />
          <Route path="earnings" element={<VendorEarnings />} />
          <Route path="documents" element={<VendorDocuments />} />
          <Route path="settings" element={<VendorSettings />} />
        </Route>
      </Routes>
    </UserProvider>
  );
}

export default App;