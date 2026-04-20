import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  UserIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';
import { contactsApi, activitiesApi } from '../../services/api';
import { ContactForm } from './ContactForm';
import { AssignmentDropdown } from '../../components/AssignmentDropdown';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: {
    id: string;
    name: string;
    domain?: string;
    industry?: string;
  };
  status: 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'COLD' | 'WARM' | 'HOT' | 'CLOSED_WON' | 'CLOSED_LOST';
  tags: { id: string; name: string; color: string }[];
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';
  subject: string;
  description?: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

const statusColors: Record<string, string> = {
  LEAD: 'apple-badge apple-badge-blue',
  PROSPECT: 'apple-badge apple-badge-yellow',
  CUSTOMER: 'apple-badge apple-badge-green',
  COLD: 'apple-badge apple-badge-gray',
  WARM: 'apple-badge apple-badge-orange',
  HOT: 'apple-badge apple-badge-red',
  CLOSED_WON: 'apple-badge apple-badge-green',
  CLOSED_LOST: 'apple-badge apple-badge-gray',
};

const activityIcons = {
  CALL: PhoneIcon,
  EMAIL: EnvelopeIcon,
  MEETING: UserIcon,
  NOTE: DocumentTextIcon,
};

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [showCallOptions, setShowCallOptions] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');

  useEffect(() => {
    if (id) {
      loadContact();
      loadActivities();
    }
  }, [id]);

  const loadContact = async () => {
    try {
      setLoading(true);
      const response = await contactsApi.getById(id!);
      setContact(response.contact);
    } catch (err) {
      setError('Failed to load contact');
      console.error('Error loading contact:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await activitiesApi.getByContact(id!);
      setActivities(response.activities || []);
    } catch (err) {
      console.error('Error loading activities:', err);
    }
  };

  const handleDelete = async () => {
    if (!contact || !confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      await contactsApi.delete(contact.id);
      navigate('/contacts');
    } catch (err) {
      setError('Failed to delete contact');
    }
  };

  const handleEditClose = () => {
    setShowEditModal(false);
    loadContact();
  };

  // Navigate back to where the user came from (company page, contacts list, or browser history)
  const goBack = () => {
    // If contact has a company, and user came from that company page, go back there
    if (contact?.company?.id && location.state?.from) {
      navigate(location.state.from);
    } else if (contact?.company?.id && document.referrer.includes('/companies/')) {
      navigate(`/companies/${contact.company.id}`);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/contacts');
    }
  };

  const handleEnrich = async () => {
    if (!contact) return;

    try {
      setEnriching(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/enrichment/contacts/${contact.id}/enrich`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crmToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enrich contact');
      }

      const enrichmentResult = await response.json();

      // Reload contact data
      await loadContact();
      setEnriching(false);

      // Show success message
      alert(`✅ Contact enriched successfully! Profile updated with LinkedIn data.`);
    } catch (err: any) {
      console.error('Error enriching contact:', err);
      setError(err.message || 'Failed to enrich contact');
      setEnriching(false);
    }
  };

  const handleMakeCall = async (callType: 'phone' | 'meet') => {
    if (!contact) return;

    if (callType === 'phone') {
      // Direct phone call using tel: protocol (opens Google Voice, Phone app, or Skype)
      if (contact.phone) {
        // Log the call activity
        try {
          await activitiesApi.create({
            type: 'CALL',
            subject: `Call to ${contact.firstName} ${contact.lastName}`,
            description: `Outbound call to ${contact.phone}`,
            contactId: contact.id,
            date: new Date().toISOString(),
          });
          await loadActivities();
        } catch (err) {
          console.error('Failed to log call activity:', err);
        }

        // Initiate the call
        window.location.href = `tel:${contact.phone}`;
      } else {
        alert('No phone number available for this contact');
      }
    } else if (callType === 'meet') {
      // Create a Google Meet link and log as activity
      try {
        // Generate a unique Google Meet link
        const meetLink = `https://meet.google.com/new`;

        await activitiesApi.create({
          type: 'MEETING',
          subject: `Google Meet with ${contact.firstName} ${contact.lastName}`,
          description: `Video call via Google Meet: ${meetLink}`,
          contactId: contact.id,
          date: new Date().toISOString(),
        });
        await loadActivities();

        // Open Google Meet in new tab
        window.open(meetLink, '_blank');
        alert(`Google Meet link created! Share this with ${contact.firstName}: ${meetLink}`);
      } catch (err) {
        console.error('Failed to create Google Meet activity:', err);
        alert('Failed to create Google Meet link');
      }
    }

    setShowCallOptions(false);
  };

  const handleSendSMS = async () => {
    if (!contact || !contact.phone || !smsMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      // Create SMS activity
      const activity = await activitiesApi.create({
        type: 'NOTE',
        subject: `SMS to ${contact.firstName} ${contact.lastName}`,
        description: smsMessage,
        contactId: contact.id,
        date: new Date().toISOString(),
      });

      // Generate SMS link using Google Voice/Messages
      const smsLink = `sms:${contact.phone}?body=${encodeURIComponent(smsMessage)}`;

      // Open SMS app with pre-filled message
      window.location.href = smsLink;

      // Show success message
      alert(`SMS ready to send via Google Voice! The message has been pre-filled for you.`);

      // Reload activities
      await loadActivities();

      // Close modal and reset
      setShowSMSModal(false);
      setSmsMessage('');
    } catch (err) {
      console.error('Failed to create SMS activity:', err);
      alert('Failed to create SMS');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !contact) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="apple-heading-2 mb-4">Contact Not Found</h1>
          <p className="apple-caption mb-4">{error}</p>
          <button
            onClick={() => navigate('/contacts')}
            className="apple-button-primary"
          >
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  if (!contact) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={goBack}
            className="apple-button-icon"
            title="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-4">
            <div className="apple-avatar" style={{ width: '64px', height: '64px', fontSize: '20px' }}>
              {contact.firstName[0]}{contact.lastName[0]}
            </div>
            <div>
              <h1 className="apple-heading-1">
                {contact.firstName} {contact.lastName}
              </h1>
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center text-sm font-medium text-[#CBD5E1]">
                  <EnvelopeIcon className="h-4 w-4 mr-1" />
                  {contact.email}
                </div>
                {contact.phone && (
                  <div className="flex items-center text-sm font-medium text-[#CBD5E1]">
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    {contact.phone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SparklesIcon className="h-4 w-4" />
            <span>{enriching ? 'Enriching...' : 'AI Enrich'}</span>
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="apple-button-primary flex items-center gap-2"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleDelete}
            className="apple-button-secondary flex items-center gap-2 text-red-600 hover:bg-red-500/10"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { id: 'overview', name: 'Overview', icon: UserIcon, gradient: 'from-indigo-500 to-purple-600' },
            { id: 'activities', name: 'Activities', icon: ClockIcon, gradient: 'from-indigo-500 to-purple-600' },
            { id: 'deals', name: 'Deals', icon: CurrencyDollarIcon, gradient: 'from-green-500 to-green-600' },
            { id: 'notes', name: 'Notes', icon: ChatBubbleLeftIcon, gradient: 'from-orange-500 to-orange-600' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative overflow-hidden rounded-xl p-4 transition-all duration-200 transform ${
                  isActive
                    ? `bg-gradient-to-br ${tab.gradient} text-white shadow-lg scale-105`
                    : 'bg-[#161625] hover:bg-[#12121f] text-[#CBD5E1] shadow-sm hover:shadow-md hover:-translate-y-1'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  <div className={`${isActive ? 'bg-[#161625] bg-opacity-20' : 'bg-[#1c1c30]'} rounded-lg p-2`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-[#94A3B8]'}`} />
                  </div>
                  <span className="font-semibold text-sm">{tab.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="apple-card">
                <h3 className="apple-heading-3 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1]">First Name</label>
                    <p className="mt-1 text-sm text-[#F1F5F9]">{contact.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1]">Last Name</label>
                    <p className="mt-1 text-sm text-[#F1F5F9]">{contact.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1]">Email</label>
                    <p className="mt-1 text-sm text-[#F1F5F9]">{contact.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1]">Phone</label>
                    <p className="mt-1 text-sm text-[#F1F5F9]">{contact.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1]">Status</label>
                    <span className={`inline-flex mt-1 ${statusColors[contact.status]}`}>
                      {contact.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1]">Created</label>
                    <p className="mt-1 text-sm text-[#F1F5F9]">{formatDate(contact.createdAt)}</p>
                  </div>
                </div>
                
                {contact.tags.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 text-xs rounded-full bg-[#1c1c30] text-[#CBD5E1]"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Fields */}
              {contact.customFields && Object.keys(contact.customFields).length > 0 && (
                <div className="apple-card">
                  <h3 className="apple-heading-3 mb-4 flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-indigo-400" />
                    Custom Fields
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(contact.customFields).map(([key, value]) => (
                      <div key={key} className="bg-gradient-to-br from-orange-50 to-rose-50 p-4 rounded-lg border border-orange-200">
                        <label className="block text-sm font-semibold text-[#E2E8F0] mb-1">
                          {key}
                        </label>
                        <p className="text-sm text-[#F1F5F9] font-medium">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contact.company && (
                <div className="apple-card">
                  <h3 className="apple-heading-3 mb-4">Company Information</h3>
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="h-8 w-8 text-[#64748B]" />
                    <div>
                      <p className="font-medium text-[#F1F5F9]">{contact.company.name}</p>
                      {contact.company.domain && (
                        <p className="text-sm text-[#94A3B8]">{contact.company.domain}</p>
                      )}
                      {contact.company.industry && (
                        <p className="text-sm text-[#94A3B8]">{contact.company.industry}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Team Assignment */}
              <AssignmentDropdown
                resourceType="contact"
                resourceId={contact.id}
                currentAssignedToId={contact.assignedToId || null}
                currentAssignedTo={contact.assignedTo}
                onAssignmentChange={loadContact}
              />
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="apple-card">
              <h3 className="apple-heading-3 mb-4">Recent Activities</h3>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = activityIcons[activity.type];
                    return (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 bg-[#12121f] rounded-lg">
                        <Icon className="h-5 w-5 text-[#64748B] mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-[#F1F5F9]">{activity.subject}</p>
                          {activity.description && (
                            <p className="text-sm text-[#94A3B8] mt-1">{activity.description}</p>
                          )}
                          <p className="text-xs text-[#94A3B8] mt-2">
                            {formatDateTime(activity.createdAt)} • {activity.user.firstName} {activity.user.lastName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-[#64748B] mx-auto mb-4" />
                  <p className="text-[#94A3B8]">No activities recorded yet.</p>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'deals' || activeTab === 'notes') && (
            <div className="apple-card">
              <div className="text-center py-8">
                <p className="text-[#94A3B8]">{activeTab === 'deals' ? 'Deals' : 'Notes'} feature coming soon.</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="apple-card">
            <h3 className="apple-heading-3 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="apple-button-primary w-full flex items-center justify-center gap-2">
                <EnvelopeIcon className="h-4 w-4" />
                Send Email
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    console.log('Make Call clicked, showCallOptions:', showCallOptions);
                    setShowCallOptions(!showCallOptions);
                  }}
                  className="apple-button-secondary w-full flex items-center justify-center gap-2"
                  disabled={!contact.phone}
                >
                  <PhoneIcon className="h-4 w-4" />
                  Make Call
                  <svg
                    className={`h-4 w-4 transition-transform ${showCallOptions ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showCallOptions && (
                  <>
                    {/* Backdrop to close dropdown when clicking outside */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowCallOptions(false)}
                    ></div>

                    {/* Dropdown menu */}
                    <div className="absolute z-20 mt-2 w-full bg-[#161625] rounded-lg shadow-xl border-2 border-[#33335a] py-2 animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Phone Call clicked');
                          handleMakeCall('phone');
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-blue-500/10 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 bg-blue-500/15 rounded-full flex items-center justify-center">
                          <PhoneIcon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-[#F1F5F9]">Phone Call (FREE)</div>
                          <div className="text-xs text-[#94A3B8]">Via Google Voice: {contact.phone || 'No number'}</div>
                        </div>
                      </button>
                      <div className="border-t border-[#2a2a44] my-1"></div>
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Google Meet clicked');
                          handleMakeCall('meet');
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-green-500/10 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 bg-green-500/15 rounded-full flex items-center justify-center">
                          <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15,8.5V7a1,1,0,0,0-1-1H4A1,1,0,0,0,3,7V17a1,1,0,0,0,1,1H14a1,1,0,0,0,1-1V15.5l5,3.5V5Z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-[#F1F5F9]">Google Meet (FREE)</div>
                          <div className="text-xs text-[#94A3B8]">Start instant video call</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowSMSModal(true)}
                disabled={!contact.phone}
                className="apple-button-secondary w-full flex items-center justify-center gap-2"
              >
                <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                Send SMS (FREE)
              </button>
              <button className="apple-button-secondary w-full flex items-center justify-center gap-2">
                <DocumentTextIcon className="h-4 w-4" />
                Add Note
              </button>
            </div>
          </div>

          <div className="apple-card">
            <h3 className="apple-heading-3 mb-4">Contact Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-[#CBD5E1]">Created:</span>
                <p className="text-[#94A3B8]">{formatDate(contact.createdAt)}</p>
              </div>
              <div>
                <span className="font-medium text-[#CBD5E1]">Last Updated:</span>
                <p className="text-[#94A3B8]">{formatDate(contact.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ContactForm
          contact={contact}
          companies={[]} // Will be loaded in the form
          onClose={handleEditClose}
        />
      )}

      {/* SMS Modal */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161625] rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[#F1F5F9]">
                Send SMS via Google Voice
              </h3>
              <button
                onClick={() => setShowSMSModal(false)}
                className="text-[#64748B] hover:text-[#94A3B8]"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-[#94A3B8] mb-2">
                📱 To: <span className="font-medium">{contact.firstName} {contact.lastName}</span> ({contact.phone})
              </p>
              <p className="text-xs text-green-600 mb-4">
                ✨ FREE - No charges! Uses Google Voice/Messages
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                Message
              </label>
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                className="w-full px-4 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={1600}
              />
              <p className="text-xs text-[#94A3B8] mt-1">
                {smsMessage.length}/1600 characters
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                💡 <strong>How it works:</strong> Click "Send" to open Google Messages with your message pre-filled.
                Then just hit send from your Google Voice number!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSMSModal(false)}
                className="flex-1 px-4 py-2 border border-[#33335a] rounded-lg text-[#CBD5E1] hover:bg-[#12121f] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSMS}
                disabled={!smsMessage.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send SMS (FREE)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}