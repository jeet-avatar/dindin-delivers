import { useState, useEffect } from 'react';
import {
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  VideoCameraIcon,
  SparklesIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { ActivitiesHelpGuide } from '../../components/ActivitiesHelpGuide';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  variables: string[];
  isActive: boolean;
}

interface Activity {
  id: string;
  type: string;
  subject?: string;
  title?: string;
  description?: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  deal?: {
    id: string;
    title: string;
  };
  user?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  status?: string;
  emailStatus?: string;
  emailSentAt?: string;
  isCompleted?: boolean;
  taskStatus?: string;
  meetingLink?: string;
  meetingStartTime?: string;
  meetingEndTime?: string;
}

const activityTypes = [
  { value: 'all', label: 'All Activities', icon: ClipboardDocumentCheckIcon },
  { value: 'EMAIL', label: 'Email', icon: EnvelopeIcon },
  { value: 'CALL', label: 'Call', icon: PhoneIcon },
  { value: 'MEETING', label: 'Meeting', icon: CalendarIcon },
  { value: 'NOTE', label: 'Note', icon: DocumentTextIcon },
  { value: 'TASK', label: 'Task', icon: ClipboardDocumentCheckIcon },
];

export function ActivitiesPage() {
  const { gradients } = useTheme();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'email' | 'call' | 'meeting' | 'task' | 'create'>('create');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  // Companies and Contacts state
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    to: [''],
    cc: [''],
    bcc: [''],
    subject: '',
    htmlContent: '',
  });

  // Call form state
  const [callForm, setCallForm] = useState({
    phoneNumber: '',
    notes: '',
  });

  // Meeting form state
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    attendees: [''],
    location: 'Online',
    calendarPlatform: 'google', // google, zoom, teams
  });

  const [sendInvitation, setSendInvitation] = useState(false);

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
  });

  // Create activity form
  const [createForm, setCreateForm] = useState({
    type: 'EMAIL',
    subject: '',
    description: '',
  });

  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchActivities();
    fetchCompanies();
    fetchContacts();
  }, []);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('crmToken');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/activities', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      setError(err.message || 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      if (!token) return;

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/companies', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      if (!token) return;

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/contacts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const handleCreateActivity = async () => {
    try {
      setIsSending(true);
      const token = localStorage.getItem('crmToken');
      if (!token) return;

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/activities', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: createForm.type,
          subject: createForm.subject,
          description: createForm.description,
          priority: 'MEDIUM',
        }),
      });

      if (response.ok) {
        await fetchActivities();
        setShowModal(false);
        showNotification('success', 'Activity created successfully!');
        setCreateForm({ type: 'EMAIL', subject: '', description: '' });
      }
    } catch (err) {
      console.error('Error creating activity:', err);
      showNotification('error', 'Failed to create activity');
    } finally {
      setIsSending(false);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const token = localStorage.getItem('crmToken');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email-templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmailTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching email templates:', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);

    if (!templateId) return;

    const template = emailTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Replace variables with contact data if available
    let subject = template.subject;
    let htmlContent = template.htmlContent;

    if (selectedActivity?.contact) {
      const contact = selectedActivity.contact;
      const replacements: Record<string, string> = {
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        phone: contact.phone || '',
        companyName: '', // Could be enhanced with company data
        position: '', // Could be enhanced with position data
      };

      Object.entries(replacements).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        subject = subject.replace(regex, value);
        htmlContent = htmlContent.replace(regex, value);
      });
    }

    setEmailForm(prev => ({
      ...prev,
      subject,
      htmlContent,
    }));
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedContactId(''); // Reset contact when company changes

    // Filter contacts by selected company
    if (companyId) {
      const filtered = contacts.filter((contact: any) => contact.companyId === companyId);
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  };

  const handleContactChange = (contactId: string) => {
    setSelectedContactId(contactId);

    // Find the selected contact and populate email field
    const contact = contacts.find((c: any) => c.id === contactId);
    if (contact && contact.email) {
      setEmailForm(prev => ({
        ...prev,
        to: [contact.email]
      }));
    }
  };

  const handleOpenModal = (type: 'email' | 'call' | 'meeting' | 'task', activity: Activity) => {
    setModalType(type);
    setSelectedActivity(activity);

    if (type === 'email') {
      // Reset selections
      setSelectedCompanyId('');
      setSelectedContactId('');
      setFilteredContacts(contacts);

      setEmailForm({
        to: activity.contact?.email ? [activity.contact.email] : [''],
        cc: [''],
        bcc: [''],
        subject: activity.subject || 'Follow-up',
        htmlContent: activity.description || '',
      });
      setSelectedTemplateId('');
      fetchEmailTemplates(); // Fetch templates when opening email modal
    } else if (type === 'call') {
      setCallForm({
        phoneNumber: activity.contact?.phone || '',
        notes: activity.description || '',
      });
    } else if (type === 'meeting') {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      setMeetingForm({
        title: activity.subject || 'Meeting',
        description: activity.description || '',
        startTime: now.toISOString().slice(0, 16),
        endTime: oneHourLater.toISOString().slice(0, 16),
        attendees: activity.contact?.email ? [activity.contact.email] : [''],
        location: 'Online',
        calendarPlatform: 'google', // Default to Google Calendar
      });
      setSendInvitation(false); // Reset invitation checkbox
    }

    setShowModal(true);
  };

  const handleSendEmail = async () => {
    if (!selectedActivity) return;

    try {
      setIsSending(true);
      const token = localStorage.getItem('crmToken');
      if (!token) {
        showNotification('error', 'Not authenticated');
        return;
      }

      const toEmails = emailForm.to.filter(email => email.trim() !== '');
      const ccEmails = emailForm.cc.filter(email => email.trim() !== '');
      const bccEmails = emailForm.bcc.filter(email => email.trim() !== '');

      if (toEmails.length === 0) {
        showNotification('error', 'Please enter at least one recipient email');
        return;
      }

      if (!emailForm.subject.trim()) {
        showNotification('error', 'Please enter email subject');
        return;
      }

      if (!emailForm.htmlContent.trim()) {
        showNotification('error', 'Please enter email content');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/activities/${selectedActivity.id}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: toEmails,
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          bcc: bccEmails.length > 0 ? bccEmails : undefined,
          subject: emailForm.subject,
          htmlContent: emailForm.htmlContent,
          textContent: emailForm.htmlContent.replace(/<[^>]*>/g, ''),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send email');
      }

      showNotification('success', 'Email sent successfully!');
      setShowModal(false);
      await fetchActivities();
    } catch (err: any) {
      console.error('Error sending email:', err);
      showNotification('error', `Failed to send email: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleMakeFakeCall = async () => {
    if (!selectedActivity) return;

    try {
      setIsSending(true);
      showNotification('success', `Simulated call to ${callForm.phoneNumber}. In production, this would use Twilio!`);
      setShowModal(false);
    } catch (err: any) {
      showNotification('error', `Failed to make call: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!selectedActivity) return;

    try {
      setIsSending(true);
      const token = localStorage.getItem('crmToken');
      if (!token) {
        showNotification('error', 'Not authenticated');
        return;
      }

      const attendees = meetingForm.attendees.filter(email => email.trim() !== '');
      if (attendees.length === 0) {
        showNotification('error', 'Please add at least one attendee');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/activities/${selectedActivity.id}/create-meeting`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: meetingForm.title,
          description: meetingForm.description,
          startTime: new Date(meetingForm.startTime).toISOString(),
          endTime: new Date(meetingForm.endTime).toISOString(),
          attendees: attendees,
          location: meetingForm.location,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          calendarPlatform: meetingForm.calendarPlatform,
          sendInvitation: sendInvitation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create meeting');
      }

      const result = await response.json();
      const successMessage = sendInvitation
        ? `Meeting created and invitations sent to ${attendees.length} attendee${attendees.length > 1 ? 's' : ''}! Link: ${result.activity.meetingLink}`
        : `Meeting created! Link: ${result.activity.meetingLink}`;
      showNotification('success', successMessage);
      setShowModal(false);
      await fetchActivities();
    } catch (err: any) {
      console.error('Error creating meeting:', err);
      showNotification('error', `Failed to create meeting: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleCompleteTask = async (activityId: string) => {
    try {
      const token = localStorage.getItem('crmToken');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/activities/${activityId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showNotification('success', 'Task marked as complete!');
        await fetchActivities();
      }
    } catch (err) {
      console.error('Error completing task:', err);
      showNotification('error', 'Failed to complete task');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const toggleEmailExpansion = (activityId: string) => {
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const getEmailPreview = (description: string | undefined, maxLines: number = 2) => {
    if (!description) return 'No content';

    // Remove HTML tags
    const plainText = description.replace(/<[^>]*>/g, '');

    // Split into lines and take first N lines
    const lines = plainText.split('\n').filter(line => line.trim().length > 0);
    const preview = lines.slice(0, maxLines).join(' ');

    // Limit to reasonable character count (approximately 2 lines)
    const charLimit = 150;
    if (preview.length > charLimit) {
      return preview.substring(0, charLimit) + '...';
    }

    return preview || 'No content';
  };

  const addField = (field: 'to' | 'cc' | 'bcc' | 'attendees') => {
    if (field === 'attendees') {
      setMeetingForm(prev => ({ ...prev, attendees: [...prev.attendees, ''] }));
    } else {
      setEmailForm(prev => ({ ...prev, [field]: [...prev[field], ''] }));
    }
  };

  const updateField = (field: 'to' | 'cc' | 'bcc' | 'attendees', index: number, value: string) => {
    if (field === 'attendees') {
      setMeetingForm(prev => ({
        ...prev,
        attendees: prev.attendees.map((email, i) => i === index ? value : email),
      }));
    } else {
      setEmailForm(prev => ({
        ...prev,
        [field]: prev[field].map((email, i) => i === index ? value : email),
      }));
    }
  };

  const removeField = (field: 'to' | 'cc' | 'bcc' | 'attendees', index: number) => {
    if (field === 'attendees') {
      setMeetingForm(prev => ({ ...prev, attendees: prev.attendees.filter((_, i) => i !== index) }));
    } else {
      setEmailForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    }
  };

  const filteredActivities = filterType === 'all'
    ? activities
    : activities.filter(a => a.type.toUpperCase() === filterType.toUpperCase());

  const getActivityIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'EMAIL': return EnvelopeIcon;
      case 'CALL': case 'SMS': return PhoneIcon;
      case 'MEETING': return CalendarIcon;
      case 'NOTE': return DocumentTextIcon;
      case 'TASK': return ClipboardDocumentCheckIcon;
      default: return DocumentTextIcon;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'EMAIL': return 'bg-orange-500/10 text-orange-400';
      case 'CALL': case 'SMS': return 'bg-green-500/10 text-green-400';
      case 'MEETING': return 'bg-rose-500/10 text-rose-400';
      case 'NOTE': return 'bg-amber-50 text-amber-700';
      case 'TASK': return 'bg-orange-500/15 text-orange-400';
      default: return 'bg-[#12121f] text-[#CBD5E1]';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#252540] rounded w-1/4"></div>
          <div className="h-64 bg-[#252540] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-200' : 'bg-red-500/10 text-red-400 border border-red-200'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-red-600" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-[#F1F5F9]">Activities</h1>
          <button
            type="button"
            onClick={() => setShowHelpGuide(true)}
            className="p-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
            title="Show Help Guide"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-[#94A3B8] mt-1">Track emails, calls, meetings, and tasks across your CRM • Click ? for help</p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {activityTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setFilterType(type.value)}
                className={`inline-flex items-center px-4 py-2.5 rounded-xl font-bold text-sm transition-all tracking-wide shadow-sm ${
                  filterType === type.value
                    ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105`
                    : 'bg-[#161625] text-[#CBD5E1] border-2 border-[#33335a] hover:bg-[#12121f] hover:border-gray-400'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {type.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { setModalType('create'); setShowModal(true); }}
          className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 tracking-wide`}
        >
          <PlusIcon className="h-5 w-5" />
          Create Activity
        </button>
      </div>

      {/* Activities Timeline */}
      <div className="card">
        <div className="p-6">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardDocumentCheckIcon className="h-12 w-12 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#F1F5F9] mb-2">No activities found</h3>
              <p className="text-[#94A3B8] mb-4">
                {filterType === 'all' ? 'Start adding activities to track your work' : `No ${filterType} activities found`}
              </p>
              <button
                onClick={() => { setModalType('create'); setShowModal(true); }}
                className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 tracking-wide inline-flex`}
              >
                <PlusIcon className="h-5 w-5" />
                Create Activity
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredActivities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                const isEmail = activity.type.toUpperCase() === 'EMAIL';
                const isCall = activity.type.toUpperCase() === 'CALL' || activity.type.toUpperCase() === 'SMS';
                const isMeeting = activity.type.toUpperCase() === 'MEETING';
                const isTask = activity.type.toUpperCase() === 'TASK';

                return (
                  <div key={activity.id} className="relative">
                    {index !== filteredActivities.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-[#252540]"></div>
                    )}

                    <div className="flex gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center z-10`}>
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="flex-1 bg-[#12121f] rounded-lg p-4 hover:bg-[#1c1c30] transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-[#F1F5F9]">{activity.subject || activity.title || 'No subject'}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-[#94A3B8]">
                                {activity.contact ? `${activity.contact.firstName} ${activity.contact.lastName}` :
                                 activity.deal ? activity.deal.title :
                                 'No relation'}
                              </span>
                              {activity.contact?.email && (
                                <>
                                  <span className="text-[#64748B]">•</span>
                                  <span className="text-sm text-[#94A3B8]">{activity.contact.email}</span>
                                </>
                              )}
                            </div>

                            {/* Status Badges */}
                            <div className="mt-2 flex items-center gap-2">
                              {activity.emailStatus && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  activity.emailStatus === 'sent' ? 'bg-green-500/15 text-green-400' : 'bg-[#1c1c30] text-[#E2E8F0]'
                                }`}>
                                  {activity.emailStatus === 'sent' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
                                  {activity.emailStatus}
                                </span>
                              )}
                              {activity.isCompleted && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400">
                                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                                  Completed
                                </span>
                              )}
                              {activity.meetingLink && (
                                <a
                                  href={activity.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500/10 text-orange-400 hover:bg-orange-500/15 shadow-sm tracking-wide"
                                >
                                  <VideoCameraIcon className="h-4 w-4 mr-1.5" />
                                  Join Meeting
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {isEmail && !activity.emailStatus && (
                              <button
                                onClick={() => handleOpenModal('email', activity)}
                                className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide`}
                              >
                                <PaperAirplaneIcon className="h-4 w-4 mr-1.5" />
                                Send
                              </button>
                            )}
                            {isCall && (
                              <button
                                onClick={() => handleOpenModal('call', activity)}
                                className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${gradients.semantic.success.gradient} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide`}
                              >
                                <PhoneIcon className="h-4 w-4 mr-1.5" />
                                Call
                              </button>
                            )}
                            {isMeeting && !activity.meetingLink && (
                              <button
                                onClick={() => handleOpenModal('meeting', activity)}
                                className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${gradients.semantic.premium.gradient} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide`}
                              >
                                <CalendarIcon className="h-4 w-4 mr-1.5" />
                                Schedule
                              </button>
                            )}
                            {isTask && !activity.isCompleted && (
                              <button
                                onClick={() => handleCompleteTask(activity.id)}
                                className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${gradients.semantic.success.gradient} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide`}
                              >
                                <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                                Complete
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Email content with Read More functionality */}
                        {isEmail && activity.emailStatus === 'sent' ? (
                          <div className="mb-3">
                            <div className="bg-[#161625] border-2 border-[#2a2a44] rounded-lg p-4">
                              <div className="text-sm text-[#94A3B8] mb-2">
                                {expandedEmails.has(activity.id) ? (
                                  <div
                                    className="whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{
                                      __html: activity.description || 'No content'
                                    }}
                                  />
                                ) : (
                                  <p className="line-clamp-2">{getEmailPreview(activity.description)}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleEmailExpansion(activity.id)}
                                className="inline-flex items-center gap-1 text-sm font-bold text-indigo-400 hover:text-orange-400 transition-colors"
                              >
                                {expandedEmails.has(activity.id) ? (
                                  <>
                                    <span>Show Less</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  </>
                                ) : (
                                  <>
                                    <span>Read More</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[#94A3B8] text-sm mb-3">{activity.description || 'No description'}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
                          <span>{formatDate(activity.createdAt)}</span>
                          <span>•</span>
                          <span>
                            {activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161625] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border-4 border-black">
            {modalType === 'create' && (
              <>
                <div className="p-6 border-b border-[#2a2a44]">
                  <h2 className="text-2xl font-bold text-[#F1F5F9]">Create Activity</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Activity Type</label>
                    <select
                      value={createForm.type}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#33335a] rounded-md"
                    >
                      <option value="EMAIL">Email</option>
                      <option value="CALL">Call</option>
                      <option value="MEETING">Meeting</option>
                      <option value="TASK">Task</option>
                      <option value="NOTE">Note</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Subject</label>
                    <input
                      type="text"
                      value={createForm.subject}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#33335a] rounded-md"
                      placeholder="Activity subject"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Description</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#33335a] rounded-md"
                      rows={4}
                      placeholder="Activity description"
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-[#2a2a44] flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-[#CBD5E1] bg-[#161625] border-2 border-[#33335a] rounded-xl hover:bg-[#12121f] hover:border-gray-400 font-bold tracking-wide shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateActivity}
                    disabled={isSending}
                    className={`px-6 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md tracking-wide disabled:opacity-50`}
                  >
                    {isSending ? 'Creating...' : 'Create Activity'}
                  </button>
                </div>
              </>
            )}

            {modalType === 'email' && selectedActivity && (
              <>
                {/* Compact Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 flex items-center justify-between border-b-2 border-black">
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="h-6 w-6 text-white" />
                    <div>
                      <h2 className="text-lg font-bold text-white">Send Email</h2>
                      {selectedActivity.contact && (
                        <p className="text-xs text-white text-opacity-80">
                          {selectedActivity.contact.firstName} {selectedActivity.contact.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-white hover:bg-black hover:bg-opacity-10 rounded-lg p-1.5 transition-colors"
                    aria-label="Close email modal"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                  {/* Company Selection */}
                  <div>
                    <label className="block text-sm font-bold text-[#F1F5F9] mb-2">
                      Select Company
                    </label>
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      aria-label="Select company"
                    >
                      <option value="">-- Select a company --</option>
                      {companies.map((company: any) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contact Selection */}
                  <div>
                    <label className="block text-sm font-bold text-[#F1F5F9] mb-2">
                      Select Contact
                    </label>
                    <select
                      value={selectedContactId}
                      onChange={(e) => handleContactChange(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      disabled={!selectedCompanyId && filteredContacts.length === 0}
                      aria-label="Select contact"
                    >
                      <option value="">-- Select a contact --</option>
                      {(selectedCompanyId ? filteredContacts : contacts).map((contact: any) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.firstName} {contact.lastName} {contact.email ? `(${contact.email})` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedCompanyId && filteredContacts.length === 0 && (
                      <p className="text-xs text-[#94A3B8] mt-1">No contacts found for this company</p>
                    )}
                  </div>

                  {/* Email Template Selector - Compact */}
                  {emailTemplates.length > 0 && (
                    <div className="bg-orange-500/10 border-2 border-orange-300 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <SparklesIcon className="h-4 w-4 text-indigo-400" />
                        <label className="text-xs font-bold text-[#F1F5F9]">Quick Template</label>
                      </div>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-[#161625] text-sm font-medium"
                        aria-label="Select email template"
                      >
                        <option value="">-- Select a template --</option>
                        {emailTemplates.filter(t => t.isActive).map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      {selectedTemplateId && (
                        <p className="text-xs text-green-400 font-medium mt-2 flex items-center gap-1">
                          <CheckCircleIcon className="h-3 w-3" />
                          Template loaded
                        </p>
                      )}
                    </div>
                  )}

                  {/* To Field - Compact */}
                  <div>
                    <label className="block text-sm font-bold text-[#F1F5F9] mb-2">
                      To <span className="text-red-500">*</span>
                    </label>
                    {emailForm.to.map((email, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateField('to', index, e.target.value)}
                          className="flex-1 px-3 py-2 border-2 border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          placeholder="recipient@example.com"
                        />
                        {emailForm.to.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeField('to', index)}
                            className="px-3 py-1 text-red-600 hover:bg-red-500/10 rounded-lg text-sm font-bold"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {emailForm.to.length < 3 && (
                      <button
                        type="button"
                        onClick={() => addField('to')}
                        className="text-sm font-bold text-indigo-400 hover:text-orange-400"
                      >
                        + Add recipient
                      </button>
                    )}
                  </div>

                  {/* Subject Field - Compact */}
                  <div>
                    <label className="block text-sm font-bold text-[#F1F5F9] mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border-2 border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="Enter email subject..."
                    />
                  </div>

                  {/* Message Field - Compact */}
                  <div>
                    <label className="block text-sm font-bold text-[#F1F5F9] mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={emailForm.htmlContent}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, htmlContent: e.target.value }))}
                      className="w-full px-3 py-2 border-2 border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
                      rows={8}
                      placeholder="Type your email message here..."
                    />
                    <p className="text-xs text-[#94A3B8] mt-1">
                      {emailForm.htmlContent.length} characters
                    </p>
                  </div>
                </div>

                {/* Compact Footer */}
                <div className="px-5 py-3 border-t-2 border-[#2a2a44] bg-[#12121f] flex justify-between items-center">
                  <div className="text-xs text-[#94A3B8]">
                    {emailForm.to.filter(e => e.trim()).length > 0 && (
                      <span className="font-medium">
                        {emailForm.to.filter(e => e.trim()).length} recipient{emailForm.to.filter(e => e.trim()).length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-[#161625] text-[#CBD5E1] font-bold rounded-lg border-2 border-[#33335a] hover:bg-[#12121f] text-sm"
                      disabled={isSending}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={isSending}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
                    >
                      {isSending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border border-indigo-500/30 border-t-transparent"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-4 w-4" />
                          <span>Send Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {modalType === 'call' && selectedActivity && (
              <>
                <div className="p-6 border-b border-[#2a2a44]">
                  <h2 className="text-2xl font-bold text-[#F1F5F9]">Make Call</h2>
                  <p className="text-sm text-[#94A3B8] mt-1">Activity: {selectedActivity.subject}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-orange-500/10 border border-orange-200 rounded-xl p-4">
                    <p className="text-sm text-orange-400 font-medium">
                      Note: SMS/Call functionality requires a Twilio phone number. This is a simulation for now.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={callForm.phoneNumber}
                      onChange={(e) => setCallForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#33335a] rounded-md"
                      placeholder="+1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Call Notes</label>
                    <textarea
                      value={callForm.notes}
                      onChange={(e) => setCallForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#33335a] rounded-md"
                      rows={6}
                      placeholder="Notes about the call..."
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-[#2a2a44] flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-[#CBD5E1] bg-[#161625] border-2 border-[#33335a] rounded-xl hover:bg-[#12121f] hover:border-gray-400 font-bold tracking-wide shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMakeFakeCall}
                    disabled={isSending}
                    className={`inline-flex items-center px-6 py-2.5 bg-gradient-to-r ${gradients.semantic.success.gradient} text-white rounded-xl hover:shadow-lg disabled:opacity-50 font-bold tracking-wide shadow-md`}
                  >
                    {isSending ? 'Calling...' : (
                      <>
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        Simulate Call
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {modalType === 'meeting' && selectedActivity && (
              <>
                <div className="p-6 border-b border-[#2a2a44]">
                  <h2 className="text-2xl font-bold text-[#F1F5F9]">Schedule Meeting</h2>
                  <p className="text-sm text-[#94A3B8] mt-1">Activity: {selectedActivity.subject}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Meeting Title *</label>
                    <input
                      type="text"
                      value={meetingForm.title}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#33335a] rounded-md"
                      placeholder="Meeting title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Start Time *</label>
                      <input
                        type="datetime-local"
                        value={meetingForm.startTime}
                        onChange={(e) => setMeetingForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#33335a] rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#CBD5E1] mb-2">End Time *</label>
                      <input
                        type="datetime-local"
                        value={meetingForm.endTime}
                        onChange={(e) => setMeetingForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#33335a] rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Attendees *</label>
                    {meetingForm.attendees.map((email, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateField('attendees', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-[#33335a] rounded-md"
                          placeholder="attendee@example.com"
                        />
                        {meetingForm.attendees.length > 1 && (
                          <button
                            onClick={() => removeField('attendees', index)}
                            className="px-3 py-2 text-red-600 hover:bg-red-500/10 rounded-md"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addField('attendees')}
                      className="text-sm text-indigo-400 hover:text-orange-400 font-bold"
                    >
                      + Add attendee
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Description</label>
                    <textarea
                      value={meetingForm.description}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#33335a] rounded-md"
                      rows={4}
                      placeholder="Meeting description..."
                    />
                  </div>

                  {/* Calendar Platform Selection */}
                  <div>
                    <label className="block text-sm font-bold text-[#F1F5F9] mb-3">
                      Calendar Platform <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Google Calendar */}
                      <button
                        type="button"
                        onClick={() => setMeetingForm(prev => ({ ...prev, calendarPlatform: 'google' }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          meetingForm.calendarPlatform === 'google'
                            ? 'border-indigo-500 bg-orange-500/10 shadow-md'
                            : 'border-[#33335a] bg-[#161625] hover:border-orange-300'
                        }`}
                      >
                        <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
                          <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                          <path d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                          <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                          <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                        </svg>
                        <span className={`text-sm font-bold ${
                          meetingForm.calendarPlatform === 'google' ? 'text-orange-400' : 'text-[#CBD5E1]'
                        }`}>
                          Google
                        </span>
                      </button>

                      {/* Zoom */}
                      <button
                        type="button"
                        onClick={() => setMeetingForm(prev => ({ ...prev, calendarPlatform: 'zoom' }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          meetingForm.calendarPlatform === 'zoom'
                            ? 'border-indigo-500 bg-orange-500/10 shadow-md'
                            : 'border-[#33335a] bg-[#161625] hover:border-orange-300'
                        }`}
                      >
                        <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
                          <rect width="48" height="48" rx="8" fill="#2D8CFF"/>
                          <path d="M18 14h-8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V16c0-1.1-.9-2-2-2zm20 4l-8 6v-4c0-1.1-.9-2-2-2h-4v12h4c1.1 0 2-.9 2-2v-4l8 6V18z" fill="white"/>
                        </svg>
                        <span className={`text-sm font-bold ${
                          meetingForm.calendarPlatform === 'zoom' ? 'text-orange-400' : 'text-[#CBD5E1]'
                        }`}>
                          Zoom
                        </span>
                      </button>

                      {/* Microsoft Teams */}
                      <button
                        type="button"
                        onClick={() => setMeetingForm(prev => ({ ...prev, calendarPlatform: 'teams' }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          meetingForm.calendarPlatform === 'teams'
                            ? 'border-indigo-500 bg-orange-500/10 shadow-md'
                            : 'border-[#33335a] bg-[#161625] hover:border-orange-300'
                        }`}
                      >
                        <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
                          <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z" fill="#5059C9"/>
                          <path d="M31 16h-6v16h6c1.1 0 2-.9 2-2V18c0-1.1-.9-2-2-2z" fill="white"/>
                          <path d="M15 20h8v8h-8c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2z" fill="white"/>
                        </svg>
                        <span className={`text-sm font-bold ${
                          meetingForm.calendarPlatform === 'teams' ? 'text-orange-400' : 'text-[#CBD5E1]'
                        }`}>
                          Teams
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer with Send Invitation Option */}
                <div className="p-6 border-t-2 border-[#2a2a44] bg-[#12121f]">
                  {/* Send Invitation Checkbox */}
                  <div className="mb-4 flex items-center gap-3 bg-orange-500/10 border-2 border-orange-300 rounded-lg p-3">
                    <input
                      type="checkbox"
                      id="sendInvitation"
                      checked={sendInvitation}
                      onChange={(e) => setSendInvitation(e.target.checked)}
                      className="w-5 h-5 text-indigo-400 border-2 border-orange-400 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                    <label htmlFor="sendInvitation" className="flex items-center gap-2 text-sm font-bold text-[#F1F5F9] cursor-pointer">
                      <EnvelopeIcon className="h-5 w-5 text-indigo-400" />
                      Send calendar invitations to all attendees
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-[#161625] text-[#CBD5E1] font-bold rounded-lg border-2 border-[#33335a] hover:bg-[#12121f] text-sm"
                      disabled={isSending}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateMeeting}
                      disabled={isSending}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
                    >
                      {isSending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border border-indigo-500/30 border-t-transparent"></div>
                          <span>{sendInvitation ? 'Creating & Sending...' : 'Creating...'}</span>
                        </>
                      ) : (
                        <>
                          <CalendarIcon className="h-4 w-4" />
                          <span>{sendInvitation ? 'Create & Send Invites' : 'Create Meeting'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Help Guide */}
      {showHelpGuide && (
        <ActivitiesHelpGuide onClose={() => setShowHelpGuide(false)} />
      )}
    </div>
  );
}
