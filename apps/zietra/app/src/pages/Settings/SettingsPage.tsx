import { useState, useEffect } from 'react';
import {
  UserCircleIcon,
  EnvelopeIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  CreditCardIcon,
  KeyIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import MigrationWizardModal from '../../components/MigrationWizardModal';

type SettingsTab = 'profile' | 'account' | 'notifications' | 'security' | 'preferences' | 'billing' | 'data-import';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  timezone: string;
  role: string;
  avatar?: string;
  emailNotifications?: boolean;
  dealUpdates?: boolean;
  newContacts?: boolean;
  weeklyReport?: boolean;
  marketingEmails?: boolean;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  theme?: string;
  compactView?: boolean;
}

export function SettingsPage() {
  const { gradients } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    timezone: 'America/New_York',
    avatar: '',
  });

  // Account settings
  const [accountData, setAccountData] = useState({
    forwardingEmail: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    dealUpdates: true,
    newContacts: false,
    weeklyReport: true,
    marketingEmails: false,
  });

  // Session information
  const [sessionInfo, setSessionInfo] = useState({
    browser: '',
    os: '',
    location: '',
  });

  // Display preferences
  const [displayPreferences, setDisplayPreferences] = useState({
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    theme: 'light',
    compactView: false,
    timezone: 'America/New_York',
  });

  // Data Import wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [lastImportResults, setLastImportResults] = useState<{ imported: number; failed: number } | null>(null);

  // Billing & Pricing Plans
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
    detectSessionInfo();
    fetchPricingPlans();
    fetchCurrentSubscription();
  }, []);

  const detectSessionInfo = () => {
    // Detect browser
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Detect OS
    let os = 'Unknown';
    if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    setSessionInfo({
      browser,
      os,
      location: 'Location unavailable', // We'd need a geolocation API for this
    });
  };

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch user data');

      const data = await response.json();
      const user: UserData = data.user;

      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
        timezone: user.timezone || 'America/New_York',
        avatar: user.avatar || '',
      });

      // Load notification preferences from user data
      if (user.emailNotifications !== undefined) {
        setNotifications({
          emailNotifications: user.emailNotifications ?? true,
          dealUpdates: user.dealUpdates ?? true,
          newContacts: user.newContacts ?? false,
          weeklyReport: user.weeklyReport ?? true,
          marketingEmails: user.marketingEmails ?? false,
        });
      }

      // Load display preferences from user data
      if (user.language !== undefined) {
        setDisplayPreferences({
          language: user.language ?? 'en',
          dateFormat: user.dateFormat ?? 'MM/DD/YYYY',
          timeFormat: user.timeFormat ?? '12h',
          theme: user.theme ?? 'light',
          compactView: user.compactView ?? false,
          timezone: user.timezone ?? 'America/New_York',
        });
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          timezone: profileData.timezone,
        }),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const data = await response.json();
      alert(data.message || 'Profile updated successfully!');

      // Refresh user data
      await fetchUserData();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/me/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      const data = await response.json();
      alert(data.message || 'Notification preferences updated!');
    } catch (err: any) {
      console.error('Error updating notifications:', err);
      alert('Failed to update notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/me/account`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forwardingEmail: accountData.forwardingEmail,
        }),
      });

      if (!response.ok) throw new Error('Failed to update account settings');

      alert('Account settings updated successfully!');
    } catch (err: any) {
      console.error('Error updating account settings:', err);
      alert('Failed to update account settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) {
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete account');

      alert('Account deleted successfully. You will be logged out.');
      localStorage.removeItem('crmToken');
      localStorage.removeItem('crmUser');
      window.location.href = '/login';
    } catch (err: any) {
      console.error('Error deleting account:', err);
      alert('Failed to delete account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDisplayPreferences = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/me/display-preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(displayPreferences),
      });

      if (!response.ok) throw new Error('Failed to update display preferences');

      const data = await response.json();
      alert(data.message || 'Preferences updated successfully!');
    } catch (err: any) {
      console.error('Error updating display preferences:', err);
      alert('Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchPricingPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/pricing/config`);

      if (!response.ok) throw new Error('Failed to fetch pricing plans');

      const data = await response.json();
      setPricingPlans(data.plans || []);
    } catch (err: any) {
      console.error('Error fetching pricing plans:', err);
      // Set empty array if API fails - show error to user instead of outdated fallback
      setPricingPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);

        // Set current plan from subscription
        if (data.subscription) {
          setCurrentPlan({
            name: data.subscription.planName || 'Free',
            status: data.subscription.status || 'active',
            nextBillingDate: data.subscription.nextBillingDate,
            amount: data.subscription.amount,
            interval: data.subscription.interval,
          });
        } else {
          // Default to free plan
          setCurrentPlan({
            name: 'Free',
            status: 'active',
            nextBillingDate: null,
          });
        }
      } else {
        // Default to free plan if no subscription found
        setCurrentPlan({
          name: 'Free',
          status: 'active',
          nextBillingDate: null,
        });
      }
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      // Default to free plan on error
      setCurrentPlan({
        name: 'Free',
        status: 'active',
        nextBillingDate: null,
      });
    }
  };

  const handleUpgrade = async (plan: any) => {
    try {
      setIsSaving(true);

      // Handle Free plan - no Stripe checkout needed
      if (plan.id === 'free' || plan.monthlyPrice === 0) {
        alert('You are already on the Free plan. Choose a paid plan to upgrade.');
        setIsSaving(false);
        return;
      }

      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const priceId = billingCycle === 'monthly' ? plan.stripeMonthlyPriceId : plan.stripeAnnualPriceId;

      const response = await fetch(`${apiUrl}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          billingCycle,
          planId: plan.id,
          planName: plan.name,
        }),
      });

      if (!response.ok) throw new Error('Failed to create checkout session');

      const data = await response.json();

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      alert('Failed to start checkout process. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as SettingsTab, name: 'Profile', icon: UserCircleIcon },
    { id: 'account' as SettingsTab, name: 'Account', icon: EnvelopeIcon },
    { id: 'notifications' as SettingsTab, name: 'Notifications', icon: BellIcon },
    { id: 'security' as SettingsTab, name: 'Security', icon: ShieldCheckIcon },
    { id: 'preferences' as SettingsTab, name: 'Preferences', icon: GlobeAltIcon },
    { id: 'billing' as SettingsTab, name: 'Billing', icon: CreditCardIcon },
    { id: 'data-import' as SettingsTab, name: 'Data Import', icon: ArrowUpTrayIcon },
  ];

  return (
    <div className="min-h-screen bg-[#12121f] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradients.brand.primary.gradient} flex items-center justify-center shadow-xl`}>
              <UserCircleIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#F1F5F9]">
                Settings
              </h1>
              <p className="text-[#94A3B8] mt-1">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>

        {/* Top Tab Navigation - Super Admin Style */}
        <div className="mb-8">
          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              // Get gradient classes from dynamic theme
              const tabGradient = gradients.pages.settings[tab.id as keyof typeof gradients.pages.settings]
                ?? { gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/25' };
              const gradientClass = `bg-gradient-to-r ${tabGradient.gradient}`;
              const shadowClass = tabGradient.shadow;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all duration-200 text-white ${gradientClass} ${
                    activeTab === tab.id
                      ? `shadow-lg ${shadowClass}`
                      : 'opacity-60 hover:opacity-80 shadow-md'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div>
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="card">
              <div className="p-6 border-b border-[#1c1c30]">
                <h2 className="text-xl font-semibold text-[#F1F5F9]">Profile Information</h2>
                <p className="text-sm text-[#94A3B8] mt-1">Update your personal information</p>
              </div>
              <div className="p-6">
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-[#252540] rounded-full flex items-center justify-center">
                      <UserCircleIcon className="h-12 w-12 text-[#64748B]" />
                    </div>
                    <div>
                      <button type="button" className="btn-secondary btn-sm">Change Photo</button>
                      <p className="text-xs text-[#94A3B8] mt-2">JPG, PNG or GIF. Max size 2MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#CBD5E1] mb-2">First Name</label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Last Name</label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="input bg-[#12121f] cursor-not-allowed"
                    />
                    <p className="text-xs text-[#94A3B8] mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Phone</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="input"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Role</label>
                    <input
                      type="text"
                      value={profileData.role}
                      disabled
                      className="input bg-[#12121f] cursor-not-allowed"
                    />
                    <p className="text-xs text-[#94A3B8] mt-1">Role is managed by administrators</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Timezone</label>
                    <select
                      value={profileData.timezone}
                      onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                      className="input"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-[#1c1c30]">
                    <button type="submit" className="btn-primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Account Settings */}
          {activeTab === 'account' && (
            <div className="card">
              <div className="p-6 border-b border-[#1c1c30]">
                <h2 className="text-xl font-semibold text-[#F1F5F9]">Account Settings</h2>
                <p className="text-sm text-[#94A3B8] mt-1">Manage your account configuration</p>
              </div>
              <div className="p-6 space-y-6">
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveAccount(); }}>
                  <div>
                    <h3 className="text-sm font-medium text-[#F1F5F9] mb-4">Email Configuration</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Primary Email</label>
                        <input
                          type="email"
                          value={profileData.email || ''}
                          className="input bg-[#12121f] cursor-not-allowed"
                          disabled
                        />
                        <p className="text-xs text-[#94A3B8] mt-1">This is your login email and cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Forwarding Email</label>
                        <input
                          type="email"
                          value={accountData.forwardingEmail}
                          onChange={(e) => setAccountData({ ...accountData, forwardingEmail: e.target.value })}
                          placeholder="forward@example.com"
                          className="input"
                        />
                        <p className="text-xs text-[#94A3B8] mt-1">Forward notifications to this email</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#1c1c30] pt-6">
                    <h3 className="text-sm font-medium text-[#F1F5F9] mb-4">Account Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-[#12121f] rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-[#F1F5F9]">User ID</div>
                          <div className="text-xs text-[#94A3B8] font-mono">{profileData.email ? profileData.email.split('@')[0] : 'N/A'}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-[#12121f] rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-[#F1F5F9]">Account Role</div>
                          <div className="text-xs text-[#94A3B8] capitalize">{profileData.role || 'Member'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#1c1c30] pt-6">
                    <h3 className="text-sm font-medium text-[#F1F5F9] mb-4">Account Status</h3>
                    <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="text-sm font-medium text-[#F1F5F9]">Account Active</div>
                          <div className="text-xs text-[#94A3B8]">Your account is in good standing</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-[#1c1c30]">
                    <button type="submit" className="btn-primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Account Settings'}
                    </button>
                  </div>
                </form>

                <div className="border-t border-[#1c1c30] pt-6">
                  <h3 className="text-sm font-medium text-red-600 mb-4">Danger Zone</h3>
                  <div className="border border-red-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-[#F1F5F9]">Delete Account</div>
                        <div className="text-xs text-[#94A3B8]">Permanently delete your account and all data</div>
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="card">
              <div className="p-6 border-b border-[#1c1c30]">
                <h2 className="text-xl font-semibold text-[#F1F5F9]">Notification Preferences</h2>
                <p className="text-sm text-[#94A3B8] mt-1">Choose what notifications you want to receive</p>
              </div>
              <div className="p-6">
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveNotifications(); }}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#F1F5F9]">Email Notifications</div>
                        <div className="text-xs text-[#94A3B8]">Receive notifications via email</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.emailNotifications}
                        onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#F1F5F9]">Deal Updates</div>
                        <div className="text-xs text-[#94A3B8]">Get notified when deals change status</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.dealUpdates}
                        onChange={(e) => setNotifications({ ...notifications, dealUpdates: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#F1F5F9]">New Contacts</div>
                        <div className="text-xs text-[#94A3B8]">Alert when new contacts are added</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.newContacts}
                        onChange={(e) => setNotifications({ ...notifications, newContacts: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#F1F5F9]">Weekly Report</div>
                        <div className="text-xs text-[#94A3B8]">Receive weekly activity summary</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.weeklyReport}
                        onChange={(e) => setNotifications({ ...notifications, weeklyReport: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#F1F5F9]">Marketing Emails</div>
                        <div className="text-xs text-[#94A3B8]">Promotional and marketing content</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.marketingEmails}
                        onChange={(e) => setNotifications({ ...notifications, marketingEmails: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-[#1c1c30]">
                    <button type="submit" className="btn-primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="card">
                <div className="p-6 border-b border-[#1c1c30]">
                  <h2 className="text-xl font-semibold text-[#F1F5F9]">Security Settings</h2>
                  <p className="text-sm text-[#94A3B8] mt-1">Manage your password and security options</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-[#F1F5F9] mb-4">Change Password</h3>
                    <form className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Current Password</label>
                        <input type="password" className="input" placeholder="Enter current password" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#CBD5E1] mb-2">New Password</label>
                        <input type="password" className="input" placeholder="Enter new password" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Confirm New Password</label>
                        <input type="password" className="input" placeholder="Confirm new password" />
                      </div>
                      <button type="submit" className="btn-primary">Update Password</button>
                    </form>
                  </div>

                  <div className="border-t border-[#1c1c30] pt-6">
                    <h3 className="text-sm font-medium text-[#F1F5F9] mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 bg-[#12121f] rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-[#F1F5F9]">2FA Status</div>
                        <div className="text-xs text-[#94A3B8]">Add an extra layer of security</div>
                      </div>
                      <button className="btn-secondary btn-sm">Enable 2FA</button>
                    </div>
                  </div>

                  <div className="border-t border-[#1c1c30] pt-6">
                    <h3 className="text-sm font-medium text-[#F1F5F9] mb-4">Active Sessions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-[#12121f] rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-[#F1F5F9]">Current Session</div>
                          <div className="text-xs text-[#94A3B8]">
                            {sessionInfo.os} • {sessionInfo.browser} • {sessionInfo.location}
                          </div>
                        </div>
                        <span className="text-xs text-green-600 font-medium">Active Now</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="card">
              <div className="p-6 border-b border-[#1c1c30]">
                <h2 className="text-xl font-semibold text-[#F1F5F9]">Display Preferences</h2>
                <p className="text-sm text-[#94A3B8] mt-1">Customize how you interact with the application</p>
              </div>
              <div className="p-6">
                <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSaveDisplayPreferences(); }}>
                  {/* Language & Region */}
                  <div>
                    <h3 className="text-sm font-medium text-[#F1F5F9] mb-4">Language & Region</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Language</label>
                        <select
                          value={displayPreferences.language}
                          onChange={(e) => setDisplayPreferences({ ...displayPreferences, language: e.target.value })}
                          className="input"
                        >
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          <option value="fr">Français</option>
                          <option value="de">Deutsch</option>
                          <option value="pt">Português</option>
                          <option value="zh">中文</option>
                        </select>
                        <p className="text-xs text-[#94A3B8] mt-1">Select your preferred language for the interface</p>
                      </div>

                      <div>
                        <label className="label">Timezone</label>
                        <select
                          value={displayPreferences.timezone}
                          onChange={(e) => setDisplayPreferences({ ...displayPreferences, timezone: e.target.value })}
                          className="input"
                        >
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="America/Phoenix">Arizona</option>
                          <option value="America/Anchorage">Alaska</option>
                          <option value="Pacific/Honolulu">Hawaii</option>
                          <option value="Europe/London">London (GMT)</option>
                          <option value="Europe/Paris">Paris (CET)</option>
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                          <option value="Australia/Sydney">Sydney (AEDT)</option>
                          <option value="UTC">UTC</option>
                        </select>
                        <p className="text-xs text-[#94A3B8] mt-1">All times will be displayed in this timezone</p>
                      </div>

                      <div>
                        <label className="label">Date Format</label>
                        <select
                          value={displayPreferences.dateFormat}
                          onChange={(e) => setDisplayPreferences({ ...displayPreferences, dateFormat: e.target.value })}
                          className="input"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
                          <option value="MMM DD, YYYY">MMM DD, YYYY (Dec 31, 2025)</option>
                          <option value="DD MMM YYYY">DD MMM YYYY (31 Dec 2025)</option>
                        </select>
                        <p className="text-xs text-[#94A3B8] mt-1">Choose how dates are displayed throughout the app</p>
                      </div>

                      <div>
                        <label className="label">Time Format</label>
                        <select
                          value={displayPreferences.timeFormat}
                          onChange={(e) => setDisplayPreferences({ ...displayPreferences, timeFormat: e.target.value })}
                          className="input"
                        >
                          <option value="12h">12-hour (2:30 PM)</option>
                          <option value="24h">24-hour (14:30)</option>
                        </select>
                        <p className="text-xs text-[#94A3B8] mt-1">Select your preferred time format</p>
                      </div>
                    </div>
                  </div>

                  {/* Appearance */}
                  <div className="border-t border-[#1c1c30] pt-6">
                    <h3 className="text-sm font-medium text-[#F1F5F9] mb-4">Appearance</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Theme</label>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setDisplayPreferences({ ...displayPreferences, theme: 'light' })}
                            className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                              displayPreferences.theme === 'light'
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-[#2a2a44] hover:border-[#33335a]'
                            }`}
                          >
                            <div className="w-12 h-12 bg-[#161625] border-2 border-[#33335a] rounded mb-2"></div>
                            <span className="text-sm font-medium text-[#F1F5F9]">Light</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDisplayPreferences({ ...displayPreferences, theme: 'dark' })}
                            className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                              displayPreferences.theme === 'dark'
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-[#2a2a44] hover:border-[#33335a]'
                            }`}
                          >
                            <div className="w-12 h-12 bg-gray-800 border-2 border-gray-600 rounded mb-2"></div>
                            <span className="text-sm font-medium text-[#F1F5F9]">Dark</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDisplayPreferences({ ...displayPreferences, theme: 'system' })}
                            className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                              displayPreferences.theme === 'system'
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-[#2a2a44] hover:border-[#33335a]'
                            }`}
                          >
                            <div className="w-12 h-12 bg-gradient-to-br from-white to-gray-800 border-2 border-gray-400 rounded mb-2"></div>
                            <span className="text-sm font-medium text-[#F1F5F9]">System</span>
                          </button>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-2">Choose your color theme preference (Note: Dark mode coming soon)</p>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#12121f] rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-[#F1F5F9]">Compact View</div>
                          <div className="text-xs text-[#94A3B8]">Reduce spacing and show more content</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={displayPreferences.compactView}
                          onChange={(e) => setDisplayPreferences({ ...displayPreferences, compactView: e.target.checked })}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-[#1c1c30]">
                    <button type="submit" className="btn-primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Data Import Tab */}
          {activeTab === 'data-import' && (
            <div className="card">
              <div className="p-6 border-b border-[#1c1c30]">
                <h2 className="text-xl font-semibold text-[#F1F5F9]">Data Import</h2>
                <p className="text-sm text-[#94A3B8] mt-1">Import your existing CRM data into Zietra</p>
              </div>
              <div className="p-6">
                <p className="text-[#94A3B8] mb-6" style={{ lineHeight: 1.6 }}>
                  Import contacts, companies, and deals from Salesforce, HubSpot, ERP, Pipedrive, Zoho, or any CRM.
                  Download a template CSV for your source, fill it in, and follow the step-by-step wizard to map your columns and import your data.
                </p>
                {lastImportResults && (
                  <div className="mb-6 p-4 bg-[#12121f] border border-[#2a2a44] rounded-lg text-sm text-[#94A3B8]">
                    Last import: <strong>{lastImportResults.imported}</strong> records imported,{' '}
                    <strong>{lastImportResults.failed}</strong> failed.
                  </div>
                )}
                <button
                  onClick={() => setIsWizardOpen(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <ArrowUpTrayIcon className="h-5 w-5" />
                  Launch Migration Wizard
                </button>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current Plan Section */}
              <div className="card">
                <div className="p-6 border-b border-[#1c1c30]">
                  <h2 className="text-xl font-semibold text-[#F1F5F9]">Current Plan</h2>
                  <p className="text-sm text-[#94A3B8] mt-1">Manage your subscription and billing</p>
                </div>
                <div className="p-6">
                  {!currentPlan ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#2a2a44] border-t-primary-600"></div>
                      <p className="text-[#94A3B8] mt-4">Loading subscription...</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-orange-50 to-rose-50 rounded-lg border border-primary-100">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#161625] rounded-lg shadow-sm">
                          <CreditCardIcon className="h-8 w-8 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#F1F5F9]">{currentPlan.name} Plan</h3>
                          {currentPlan.amount && currentPlan.interval ? (
                            <p className="text-sm text-[#94A3B8]">
                              ${(currentPlan.amount / 100).toFixed(2)}/{currentPlan.interval === 'month' ? 'month' : 'year'}
                            </p>
                          ) : (
                            <p className="text-sm text-[#94A3B8]">Free - No payment required</p>
                          )}
                          {currentPlan.nextBillingDate && (
                            <p className="text-xs text-[#94A3B8] mt-1">
                              Next billing: {new Date(currentPlan.nextBillingDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          currentPlan.status === 'active'
                            ? 'bg-green-500/15 text-green-400'
                            : currentPlan.status === 'past_due'
                            ? 'bg-yellow-500/15 text-yellow-400'
                            : 'bg-[#1c1c30] text-[#E2E8F0]'
                        }`}>
                          {currentPlan.status === 'active' ? '✓ Active' : currentPlan.status?.replace('_', ' ') || 'Active'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Plans Section */}
              <div className="card">
                <div className="p-6 border-b border-[#1c1c30]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-[#F1F5F9]">Available Plans</h2>
                      <p className="text-sm text-[#94A3B8] mt-1">Upgrade or change your plan anytime</p>
                    </div>
                    {/* Billing Cycle Toggle */}
                    <div className="flex items-center gap-3 bg-[#1c1c30] rounded-lg p-1">
                      <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          billingCycle === 'monthly'
                            ? 'bg-[#161625] text-[#F1F5F9] shadow-sm'
                            : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingCycle('annual')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          billingCycle === 'annual'
                            ? 'bg-[#161625] text-[#F1F5F9] shadow-sm'
                            : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                        }`}
                      >
                        Annual
                        <span className="ml-2 text-xs text-green-600 font-semibold">Save 17%</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {isLoadingPlans ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#2a2a44] border-t-primary-600"></div>
                      <p className="text-[#94A3B8] mt-4">Loading pricing plans...</p>
                    </div>
                  ) : pricingPlans.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-red-600 font-semibold mb-2">Failed to load pricing plans</p>
                      <p className="text-[#94A3B8] mb-4">Please try refreshing the page</p>
                      <button
                        onClick={fetchPricingPlans}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {pricingPlans.map((plan) => {
                        // Get dynamic gradient for this plan
                        const planGradient = gradients.pages.pricing[plan.id as keyof typeof gradients.pages.pricing];
                        const headerGradientClass = planGradient ? `bg-gradient-to-r ${planGradient.gradient}` : 'bg-gradient-to-r from-[#12121f]0 to-gray-700';
                        const buttonGradientClass = planGradient ? `bg-gradient-to-r ${planGradient.gradient} ${planGradient.hover}` : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700';

                        return (
                        <div
                          key={plan.id}
                          className={`relative rounded-2xl overflow-visible transition-all hover:shadow-xl hover:-translate-y-1 ${
                            plan.popular ? 'shadow-lg mt-8' : 'shadow-md mt-8'
                          } flex flex-col`}
                        >
                          {/* Most Popular Badge */}
                          {plan.popular && (
                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                              <span className={`bg-gradient-to-r ${planGradient?.gradient || gradients.semantic.premium.gradient} text-white px-6 py-2 rounded-full text-xs font-bold shadow-xl whitespace-nowrap`}>
                                ⭐ Most Popular
                              </span>
                            </div>
                          )}

                          {/* Gradient Header - Dynamic from database */}
                          <div className={`px-6 py-8 text-white text-center flex-shrink-0 rounded-t-2xl ${headerGradientClass}`}>
                            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                            <p className="text-sm opacity-90 mb-4">{plan.description}</p>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-5xl font-bold">
                                ${billingCycle === 'monthly' ? plan.monthlyPrice : Math.floor(plan.annualPrice / 12)}
                              </span>
                              <span className="text-lg opacity-90">/mo</span>
                            </div>
                            {billingCycle === 'annual' && plan.annualPrice > 0 && (
                              <p className="text-xs opacity-75 mt-2">
                                Billed ${plan.annualPrice} annually
                              </p>
                            )}
                          </div>

                          {/* White Card Body */}
                          <div className="bg-[#161625] p-6 flex-1 flex flex-col">
                            <ul className="space-y-2 mb-6 flex-1 max-h-96 overflow-y-auto pr-2">
                            {plan.features.map((feature: any, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                {feature.included ? (
                                  <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <XMarkIcon className="h-4 w-4 text-[#64748B] flex-shrink-0 mt-0.5" />
                                )}
                                <span className={feature.included ? 'text-[#CBD5E1]' : 'text-[#64748B] line-through'}>
                                  {feature.text}
                                </span>
                              </li>
                            ))}
                          </ul>

                            <button
                              onClick={() => handleUpgrade(plan)}
                              disabled={isSaving}
                              className={`w-full py-3 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg mt-auto text-white disabled:opacity-50 disabled:cursor-not-allowed ${buttonGradientClass}`}
                            >
                              {isSaving ? 'Processing...' : plan.buttonText}
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="card">
                <div className="p-6 border-b border-[#1c1c30]">
                  <h2 className="text-xl font-semibold text-[#F1F5F9]">Payment Method</h2>
                  <p className="text-sm text-[#94A3B8] mt-1">Manage your payment information</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between p-4 bg-[#12121f] rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="h-6 w-6 text-[#64748B]" />
                      <div>
                        <div className="text-sm font-medium text-[#F1F5F9]">No payment method on file</div>
                        <div className="text-xs text-[#94A3B8]">Add a payment method when you upgrade</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <MigrationWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onImportComplete={(results) => {
          setLastImportResults({ imported: results.imported, failed: results.failed });
          setIsWizardOpen(false);
        }}
      />
    </div>
  );
}
