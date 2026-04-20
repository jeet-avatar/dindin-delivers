import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Auth/LoginPage';
import { SignupPage } from './pages/Auth/SignupPage';
import { OAuthCallback } from './pages/Auth/OAuthCallback';
import { ChangePasswordPage } from './pages/Auth/ChangePasswordPage';
import { VerifyEmailPage } from './pages/Auth/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContactList } from './pages/Contacts/ContactList';
import { ContactDetail } from './pages/Contacts/ContactDetail';
import { CompanyList } from './pages/Companies/CompanyList';
import { CompanyDetail } from './pages/Companies/CompanyDetail';
import { DealBoard } from './pages/Deals/DealBoard';
import { DealDetail } from './pages/Deals/DealDetail';
import { QuotesPage } from './pages/Quotes/QuotesPage';
import { ContractsPage } from './pages/Contracts/ContractsPage';
import { ImportPage } from './pages/Import/ImportPage';
import { ActivitiesPage } from './pages/Activities/ActivitiesPage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { TagsPage } from './pages/Tags/TagsPage';
import { CampaignsPage } from './pages/Campaigns/CampaignsPage';
import CampaignAnalytics from './pages/Campaigns/CampaignAnalytics';
import { VideoCampaignsPage } from './pages/VideoCampaigns/VideoCampaignsPage';
import { VideoAnalytics } from './pages/VideoCampaigns/VideoAnalytics';
import { EmailTemplatesPage } from './pages/EmailTemplates/EmailTemplatesPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { TeamPage } from './pages/Team/TeamPage';
import { AcceptInvitePage } from './pages/Auth/AcceptInvitePage';
import PricingPage from './pages/Pricing/PricingPage';
import { SubscriptionSuccess } from './pages/Subscription/SubscriptionSuccess';
import { SuperAdminDashboard } from './pages/SuperAdmin/SuperAdminDashboard';
import { SystemTemplates } from './pages/SuperAdmin/SystemTemplates';
import JobLeadsPage from './pages/JobLeads/JobLeadsPage';
import ScheduleCallPage from './pages/Landing/ScheduleCallPage';
import TalentPage from './pages/Landing/TalentPage';
import { ContractSigningPage } from './pages/Contracts/ContractSigningPage';
import type { User } from './types';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth
    const token = localStorage.getItem('crmToken');
    const userData = localStorage.getItem('crmUser');

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('crmToken');
        localStorage.removeItem('crmUser');
      }
    }

    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('crmToken');
    localStorage.removeItem('crmUser');
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#12121f]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-[#94A3B8]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
        <Routes>
          {/* Public routes — CTA landing pages (no login required) */}
          <Route path="/schedule" element={<ScheduleCallPage />} />
          <Route path="/talent" element={<TalentPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contracts/sign/:token" element={<ContractSigningPage />} />
          <Route path="/subscription/success" element={<SubscriptionSuccess />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Change password route - requires authentication but accessible before other routes */}
          {user && <Route path="/change-password" element={<ChangePasswordPage />} />}

          {/* Login route */}
          {!user && <Route path="*" element={<Navigate to="/login" replace />} />}

          {/* Protected routes */}
          {user && (
            <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
              <Route index element={<DashboardPage />} />
              <Route path="contacts" element={<ContactList />} />
              <Route path="contacts/:id" element={<ContactDetail />} />
              <Route path="companies" element={<CompanyList />} />
              <Route path="companies/:id" element={<CompanyDetail />} />
              <Route path="deals" element={<DealBoard />} />
              <Route path="deals/:id" element={<DealDetail />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="activities" element={<ActivitiesPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="tags" element={<TagsPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="campaigns/:campaignId/analytics" element={<CampaignAnalytics />} />
              <Route path="video-campaigns" element={<VideoCampaignsPage />} />
              <Route path="video-campaigns/analytics" element={<VideoAnalytics />} />
              <Route path="email-templates" element={<EmailTemplatesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="super-admin" element={<SuperAdminDashboard />} />
              <Route path="super-admin/system-templates" element={<SystemTemplates />} />
              <Route path="job-leads" element={<JobLeadsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </Router>
    </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
