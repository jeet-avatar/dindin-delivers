import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Contracts } from './pages/Contracts'
import { Invoices } from './pages/Invoices'
import { Discrepancies } from './pages/Discrepancies'
import { AuditLog } from './pages/AuditLog'
import { Compliance } from './pages/Compliance'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/contracts" element={<Contracts />} />
                      <Route path="/invoices" element={<Invoices />} />
                      <Route path="/discrepancies" element={<Discrepancies />} />
                      <Route path="/audit" element={<AuditLog />} />
                      <Route path="/compliance" element={<Compliance />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
