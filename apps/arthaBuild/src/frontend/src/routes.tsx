import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// Login/Signup/Password Reset
import { useAuth } from './hooks/useAuth';
import Auth from "./pages/Auth";
import Password from "./pages/Password";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ResetSuccess from "./pages/ResetSuccess";
import ResetFailed from "./pages/ResetFailed";
import SignUp from './pages/SignUp';
import SignUpSuccess from "./pages/SignUpSuccess";
// Main app
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import HistoryPage from "./pages/History";
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Help from './pages/Help';
// Legal pages
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Guide from './pages/Guide';
import AdminPanel from './pages/AdminPanel';
import AcceptInvite from './pages/AcceptInvite';
import VerifyEmail from './pages/VerifyEmail';
import OAuthCallback from './pages/OAuthCallback';
import MFASetup from './pages/MFASetup';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Solutions from './pages/Solutions';
import IndustryPage from './pages/IndustryPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/log-in" replace />;
  return children;
}

function AdminProtected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/log-in" replace />;
  if (user.role !== "admin") return <Navigate to="/chat/new" replace />;
  return <>{children}</>;
}

export default function RoutesApp() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {/* Auth routes */}
      <Route path="/log-in" element={<Auth />} /> 
      <Route path="/log-in/password" element={<Password />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/reset-success" element={<ResetSuccess />} />
      <Route path="/reset-failed" element={<ResetFailed />} />
      <Route path="/create-account" element={<SignUp />} />
      <Route path="/signup-success" element={<SignUpSuccess />} />
      
      {/* <Route path="/login" element={<Navigate to="/log-in" replace />} />
      <Route path="/password" element={<Navigate to="/log-in/password" replace />} /> */}
      {/* <Route path="/log-in-or-create-account" element={<Auth />} /> */}
      {/* Protected app routes */}
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/chat/:token" element={<Protected><Chat /></Protected>} />
      {/* <Route path="/app" element={<Protected><Chat /></Protected>} /> */}
      <Route path="/history" element={<Protected><HistoryPage /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/help" element={<Protected><Help /></Protected>} />
      <Route path="/guide" element={<Protected><Guide /></Protected>} />
      {/* Admin route — AdminProtected: non-admins redirected to /chat/new, unauthenticated to /log-in */}
      <Route path="/admin" element={<AdminProtected><AdminPanel /></AdminProtected>} />
      <Route path="/admin/*" element={<AdminProtected><AdminPanel /></AdminProtected>} />
      {/* Google OAuth callback — public, processes token from URL params */}
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      {/* Invite acceptance — public, no auth required (invited users are unauthenticated) */}
      <Route path="/accept-invite" element={<AcceptInvite />} />
      {/* Email verification landing — public, user may not be logged in when clicking link */}
      <Route path="/verify-email" element={<VerifyEmail />} />
      {/* MFA Setup — protected, requires authenticated user */}
      <Route path="/mfa-setup" element={<Protected><MFASetup /></Protected>} />
      {/* Legal routes — public, no auth required */}
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/solutions" element={<Solutions />} />
      <Route path="/solutions/:industry" element={<IndustryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
