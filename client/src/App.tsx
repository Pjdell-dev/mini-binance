import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import TwoFactorVerify from './pages/auth/TwoFactorVerify';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Wallets from './pages/Wallets';
import Orders from './pages/Orders';
import Portfolio from './pages/Portfolio';
import KYC from './pages/KYC';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminKYC from './pages/admin/AdminKYC';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminWallets from './pages/admin/AdminWallets';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1d23',
            color: '#fff',
            border: '1px solid #33373d',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#f04438',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Auth Routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="2fa" element={<TwoFactorVerify />} />
        </Route>

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            isAuthenticated ? <MainLayout /> : <Navigate to="/auth/login" replace />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="trading" element={<Trading />} />
          <Route path="wallets" element={<Wallets />} />
          <Route path="orders" element={<Orders />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="kyc" element={<KYC />} />
          <Route path="profile" element={<Profile />} />

          {/* Admin Routes */}
          {user?.role === 'admin' && (
            <>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="admin/kyc" element={<AdminKYC />} />
              <Route path="admin/transactions" element={<AdminTransactions />} />
              <Route path="admin/wallets" element={<AdminWallets />} />
              <Route path="admin/audit-logs" element={<AdminAuditLogs />} />
            </>
          )}
        </Route>

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
