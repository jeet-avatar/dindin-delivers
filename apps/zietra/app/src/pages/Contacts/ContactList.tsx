import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon, UserIcon, PhoneIcon, EnvelopeIcon, DocumentArrowUpIcon, ChevronDownIcon, ChevronRightIcon, BuildingOfficeIcon, SparklesIcon, QuestionMarkCircleIcon, XMarkIcon, LightBulbIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
// Commented out unused imports
// import { SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { contactsApi, companiesApi } from '../../services/api';
import { ContactForm } from './ContactForm';
import { CSVImportModal } from '../../components/CSVImportModal';
import { LeadDiscoveryModal } from '../../components/LeadDiscoveryModal';
import { ContactsHelpGuide } from '../../components/ContactsHelpGuide';
import { useTheme } from '../../contexts/ThemeContext';
// Commented out modal imports - uncomment when needed
// import { ApolloImportModal } from '../../components/ApolloImportModal';
// import { RemoveDuplicatesModal } from '../../components/RemoveDuplicatesModal';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  company?: {
    id: string;
    name: string;
  };
  status: 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'COLD' | 'WARM' | 'HOT' | 'CLOSED_WON' | 'CLOSED_LOST';
  tags: { id: string; name: string; color: string }[];
  customFields?: Record<string, any>;
  createdAt: string;
}

interface GroupedContacts {
  [companyName: string]: Contact[];
}

interface Company {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  LEAD: 'px-2 py-0.5 rounded text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30',
  PROSPECT: 'px-2 py-0.5 rounded text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30',
  CUSTOMER: 'px-2 py-0.5 rounded text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/30',
  COLD: 'px-2 py-0.5 rounded text-xs font-bold bg-[#252540] text-[#94A3B8] border border-[#3d3d5c]',
  WARM: 'px-2 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30',
  HOT: 'px-2 py-0.5 rounded text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30',
  CLOSED_WON: 'px-2 py-0.5 rounded text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/30',
  CLOSED_LOST: 'px-2 py-0.5 rounded text-xs font-bold bg-[#252540] text-[#94A3B8] border border-[#3d3d5c]',
};

export function ContactList() {
  const navigate = useNavigate();
  const { gradients } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showAICSVImport, setShowAICSVImport] = useState(false);
  const [showLeadDiscovery, setShowLeadDiscovery] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [hasSeenHelpGuide, setHasSeenHelpGuide] = useState(
    localStorage.getItem('contactsHelpSeen') === 'true'
  );
  // Commented out modal state variables - uncomment when needed
  // const [showApolloImport, setShowApolloImport] = useState(false);
  // const [showRemoveDuplicates, setShowRemoveDuplicates] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [contactsPerPage, setContactsPerPage] = useState(10);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Group filter
  const [groupFilter, setGroupFilter] = useState('');
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);

  // Bulk operations state
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Duplicate detection state
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<Contact[][]>([]);

  // Dynamic custom fields - automatically detect from contact data
  const [customFieldKeys, setCustomFieldKeys] = useState<string[]>([]);

  // Check if we should open the add contact modal from query params
  useEffect(() => {
    const addContact = searchParams.get('addContact');
    const companyId = searchParams.get('companyId');
    const companyName = searchParams.get('companyName');

    if (addContact === 'true') {
      // If company info is provided, set it as editing contact with pre-selected company
      if (companyId && companyName) {
        setEditingContact({
          id: 'new',
          firstName: '',
          lastName: '',
          email: '',
          company: {
            id: companyId,
            name: companyName
          },
          status: 'LEAD',
          tags: [],
          createdAt: new Date().toISOString()
        } as Contact);
      } else {
        setEditingContact(null);
      }

      setShowModal(true);
      // Remove the query params after opening modal
      searchParams.delete('addContact');
      searchParams.delete('companyId');
      searchParams.delete('companyName');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      // Fetch ALL contacts for proper client-side grouping and pagination
      const response = await contactsApi.getAll({
        search: searchTerm,
        status: statusFilter || undefined,
        page: 1,
        limit: 1000, // Fetch all contacts for grouping
      });

      const contactsData = response.contacts || [];
      setContacts(contactsData);
      setTotalContacts(response.total || 0);

      // Extract unique groups from company tags
      const groupSet = new Set<string>();
      contactsData.forEach((c: any) => {
        const tags = c.company?.tags || [];
        if (tags.length > 0 && tags[0]) groupSet.add(tags[0]);
      });
      setAvailableGroups(Array.from(groupSet).sort());

      // Dynamically detect custom field keys from all contacts
      const customFieldsSet = new Set<string>();
      contactsData.forEach(contact => {
        if (contact.customFields) {
          Object.keys(contact.customFields).forEach(key => customFieldsSet.add(key));
        }
      });
      setCustomFieldKeys(Array.from(customFieldsSet).sort());
    } catch (err: any) {
      // Gracefully handle errors - don't show error for empty data scenarios
      if (err?.response?.status === 401) {
        // Session expired or invalid - don't show error, just set empty state
        setContacts([]);
        setTotalContacts(0);
        setCustomFieldKeys([]);
      } else {
        console.error('Error loading contacts:', err);
        // Only set error for actual failures, not empty data
        setContacts([]);
        setTotalContacts(0);
        setCustomFieldKeys([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const response = await companiesApi.getAll();
      setCompanies(response.companies || []);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  useEffect(() => {
    loadContacts();
    loadCompanies();
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [searchTerm, statusFilter]);

  // Smart auto-expand: Auto-expand companies with 2-5 contacts for better UX
  // 1 contact: No expand button (single contact shows inline)
  // 2-5 contacts: Auto-expand (sweet spot - not too many, increases discoverability)
  // 6+ contacts: Keep collapsed (reduces visual clutter)
  useEffect(() => {
    if (contacts.length > 0) {
      const groupedContacts = contacts.reduce((acc, contact) => {
        const companyName = contact.company?.name || 'No Company';
        if (!acc[companyName]) {
          acc[companyName] = [];
        }
        acc[companyName].push(contact);
        return acc;
      }, {} as GroupedContacts);

      const companiesToExpand = new Set<string>();
      Object.entries(groupedContacts).forEach(([companyName, companyContacts]) => {
        // Auto-expand companies with 2-5 contacts for optimal UX
        if (companyContacts.length >= 2 && companyContacts.length <= 5) {
          companiesToExpand.add(companyName);
        }
      });

      setExpandedCompanies(companiesToExpand);
    }
  }, [contacts]);

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await contactsApi.delete(id);
      loadContacts();
    } catch (err) {
      setError('Failed to delete contact');
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowModal(true);
  };

  // Bulk operations handlers
  const toggleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedContacts.size} contact(s)?`)) return;

    try {
      // Delete all selected contacts
      await Promise.all(
        Array.from(selectedContacts).map(id => contactsApi.delete(id))
      );

      setSelectedContacts(new Set());
      loadContacts();
      alert(`✅ Successfully deleted ${selectedContacts.size} contact(s)`);
    } catch (err) {
      setError('Failed to delete some contacts');
    }
  };

  const handleExportCSV = () => {
    // Get contacts to export (selected or all filtered)
    const contactsToExport = selectedContacts.size > 0
      ? contacts.filter(c => selectedContacts.has(c.id))
      : contacts;

    if (contactsToExport.length === 0) {
      alert('No contacts to export');
      return;
    }

    // Create CSV content with ALL custom fields dynamically
    const baseHeaders = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Status', 'Role', 'Tags'];
    const headers = [...baseHeaders, ...customFieldKeys];

    const csvContent = [
      headers.join(','),
      ...contactsToExport.map(contact => {
        const baseFields = [
          contact.firstName || '',
          contact.lastName || '',
          contact.email || '',
          contact.phone || '',
          contact.company?.name || '',
          contact.status || '',
          contact.role || '',
          contact.tags.map(t => t.name).join(';') || ''
        ];

        // Add all custom fields in the same order as headers
        const customFieldValues = customFieldKeys.map(key =>
          contact.customFields?.[key] || ''
        );

        return [...baseFields, ...customFieldValues].map(field => `"${field}"`).join(',');
      })
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`✅ Exported ${contactsToExport.length} contact(s) to CSV`);
  };

  const findDuplicates = () => {
    const duplicates: Contact[][] = [];
    const processed = new Set<string>();

    // Group by EXACT same email (the strongest duplicate signal)
    const emailMap = new Map<string, Contact[]>();
    contacts.forEach(contact => {
      if (contact.email && contact.email.trim()) {
        const key = contact.email.toLowerCase().trim();
        if (!emailMap.has(key)) emailMap.set(key, []);
        emailMap.get(key)!.push(contact);
      }
    });

    // Group by EXACT same phone — but ONLY if contacts are at DIFFERENT companies
    // Same phone at same company = shared office number (NOT a duplicate)
    const phoneMap = new Map<string, Contact[]>();
    contacts.forEach(contact => {
      if (contact.phone && contact.phone.trim()) {
        const digits = contact.phone.replace(/\D/g, '');
        if (digits.length >= 7) {
          if (!phoneMap.has(digits)) phoneMap.set(digits, []);
          phoneMap.get(digits)!.push(contact);
        }
      }
    });
    // Remove phone groups where all contacts share the same company (office number)
    phoneMap.forEach((group, key) => {
      if (group.length > 1) {
        const companies = new Set(group.map(c => c.company?.name?.toLowerCase().trim()).filter(Boolean));
        if (companies.size <= 1) {
          // All same company — shared office phone, not duplicates
          phoneMap.delete(key);
        }
      }
    });

    // Group by EXACT same full name + same company (must have both first AND last name)
    const nameCompanyMap = new Map<string, Contact[]>();
    contacts.forEach(contact => {
      if (contact.firstName && contact.lastName && contact.company?.name) {
        const key = `${contact.firstName.toLowerCase().trim()}|${contact.lastName.toLowerCase().trim()}|${contact.company.name.toLowerCase().trim()}`;
        if (!nameCompanyMap.has(key)) nameCompanyMap.set(key, []);
        nameCompanyMap.get(key)!.push(contact);
      }
    });

    // Collect groups with 2+ contacts (actual duplicates)
    const addedGroups = new Set<string>();

    emailMap.forEach((group, key) => {
      if (group.length > 1) {
        const groupKey = group.map(c => c.id).sort().join(',');
        if (!addedGroups.has(groupKey)) {
          addedGroups.add(groupKey);
          duplicates.push(group);
          group.forEach(c => processed.add(c.id));
        }
      }
    });

    phoneMap.forEach((group) => {
      if (group.length > 1) {
        // Only add if not already covered by email match
        const ungrouped = group.filter(c => !processed.has(c.id));
        if (ungrouped.length > 1) {
          duplicates.push(group);
          group.forEach(c => processed.add(c.id));
        }
      }
    });

    nameCompanyMap.forEach((group) => {
      if (group.length > 1) {
        const ungrouped = group.filter(c => !processed.has(c.id));
        if (ungrouped.length > 1) {
          duplicates.push(group);
          group.forEach(c => processed.add(c.id));
        }
      }
    });

    setDuplicateGroups(duplicates);
    setShowDuplicates(true);

    if (duplicates.length === 0) {
      alert('No duplicates found. Your contact list is clean.');
    }
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    // If we came from a company page, navigate back to it
    const fromCompanyId = editingContact?.company?.id;
    setShowModal(false);
    setEditingContact(null);
    if (fromCompanyId && editingContact?.id === 'new') {
      navigate(`/companies/${fromCompanyId}`);
    } else {
      loadContacts();
    }
  };

  const toggleCompany = (companyName: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyName)) {
      newExpanded.delete(companyName);
    } else {
      newExpanded.add(companyName);
    }
    setExpandedCompanies(newExpanded);
  };

  // Filter by group then group by company
  const filteredByGroup = groupFilter
    ? contacts.filter(c => {
        const tags = (c as any).company?.tags || [];
        return tags.includes(groupFilter);
      })
    : contacts;

  const groupedContacts: GroupedContacts = filteredByGroup.reduce((acc, contact) => {
    const companyName = contact.company?.name || 'No Company';
    if (!acc[companyName]) {
      acc[companyName] = [];
    }
    acc[companyName].push(contact);
    return acc;
  }, {} as GroupedContacts);

  // Paginate by companies (groups), not individual contacts
  const companyEntries = Object.entries(groupedContacts);
  const totalCompanies = companyEntries.length;
  const totalPages = Math.ceil(totalCompanies / contactsPerPage);

  // Get companies for current page
  const startCompanyIndex = (currentPage - 1) * contactsPerPage;
  const endCompanyIndex = startCompanyIndex + contactsPerPage;
  const paginatedCompanies = companyEntries.slice(startCompanyIndex, endCompanyIndex);

  // Calculate indices for display
  const startIndex = startCompanyIndex + 1;
  const endIndex = Math.min(endCompanyIndex, totalCompanies);

  if (loading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', minHeight: '100vh' }}>
      <div style={{ background: '#161625', borderRadius: '12px', border: '1px solid #2a2a44', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #2a2a44', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))' }}>
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>Contacts</h1>
              <button
                type="button"
                onClick={() => setShowHelpGuide(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-xl border border-indigo-500/30 transition-all hover:scale-105 shadow-md"
                title="View help and quick start guide"
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
                <span>Help</span>
              </button>
            </div>
            <p style={{ fontSize: "14px", color: "#94A3B8", margin: "4px 0 0" }}>Manage your customer relationships and grow your business</p>
          </div>

          {/* First-time user help banner */}
          {!hasSeenHelpGuide && (
            <div className="bg-[#1e1e36] border border-[#2a2a44] rounded-2xl p-6 mb-6 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 border border-indigo-500/30">
                  <LightBulbIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#F1F5F9] mb-1">
                    👋 Welcome to Contacts!
                  </h3>
                  <p className="text-[#CBD5E1]">
                    Learn how to add contacts, import CSV files, discover leads, and build your customer base
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowHelpGuide(true);
                    localStorage.setItem('contactsHelpSeen', 'true');
                    setHasSeenHelpGuide(true);
                  }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-8 py-3 rounded-xl border border-indigo-500/30 hover:scale-105 transition-transform shadow-lg whitespace-nowrap"
                >
                  🚀 Show Me How
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('contactsHelpSeen', 'true');
                    setHasSeenHelpGuide(true);
                  }}
                  className="text-[#64748B] hover:text-[#94A3B8] p-2 rounded-lg hover:bg-[#1e1e36] transition-colors"
                  aria-label="Dismiss help banner"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={contacts.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title={selectedContacts.size > 0 ? `Export ${selectedContacts.size} selected contacts` : 'Export all contacts'}
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Export CSV</span>
              {selectedContacts.size > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-[#161625] text-white rounded-full text-xs font-bold">
                  {selectedContacts.size}
                </span>
              )}
            </button>

            {/* Find Duplicates Button */}
            <button
              type="button"
              onClick={findDuplicates}
              disabled={contacts.length < 2}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Find and remove duplicate contacts"
            >
              <UserIcon className="h-5 w-5" />
              <span>Find Duplicates</span>
            </button>

            {/* Discover Leads Button */}
            <button
              type="button"
              onClick={() => setShowLeadDiscovery(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 transition-all shadow-md"
            >
              <SparklesIcon className="h-5 w-5" />
              <span>Discover Leads</span>
            </button>

            {/* Import CSV Button */}
            <button
              type="button"
              onClick={() => setShowAICSVImport(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 transition-all shadow-md"
            >
              <DocumentArrowUpIcon className="h-5 w-5" />
              <span>Import CSV</span>
            </button>

            {/* Add Contact Button */}
            <button
              type="button"
              onClick={handleAddContact}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 transition-all shadow-md"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #2a2a44', background: '#12121f' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 bg-[#252540] border border-[#3d3d5c] rounded-lg text-[#F1F5F9] px-4 py-2.5 text-sm outline-none focus:border-indigo-500 placeholder-[#64748B]"
            />
          </div>

          {/* Group Filter */}
          {availableGroups.length > 0 && (
            <div className="w-full md:w-auto">
              <select
                value={groupFilter}
                onChange={(e) => { setGroupFilter(e.target.value); setCurrentPage(1); }}
                style={{ background: '#252540', border: '1px solid #3d3d5c', borderRadius: '8px', color: '#F1F5F9', padding: '10px 14px', fontSize: '13px', outline: 'none' }}
                title="Filter by group"
              >
                <option value="">All Groups</option>
                {availableGroups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ background: '#252540', border: '1px solid #3d3d5c', borderRadius: '8px', color: '#F1F5F9', padding: '10px 14px', fontSize: '13px', outline: 'none' }}
              title="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="LEAD">Lead</option>
              <option value="PROSPECT">Prospect</option>
              <option value="CUSTOMER">Customer</option>
              <option value="COLD">Cold</option>
              <option value="WARM">Warm</option>
              <option value="HOT">Hot</option>
              <option value="CLOSED_WON">Closed Won</option>
              <option value="CLOSED_LOST">Closed Lost</option>
            </select>
          </div>
        </div>
      </div>

        {/* Error Message - Only show for critical errors, not for empty states */}
        {error && contacts.length === 0 && !loading && (
          <div style={{ margin: "16px 24px", background: "#1e1e36", border: "1px solid #2a2a44", borderRadius: "12px", padding: "24px" }}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <QuestionMarkCircleIcon className="h-8 w-8 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">Having trouble loading data?</h3>
                <p className="text-sm text-[#CBD5E1] mb-4">
                  We're here to help! Our support team will get back to you shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    alert('Support ticket created! We will contact you at your registered email address.');
                    setError('');
                  }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-6 py-2 rounded-lg hover:shadow-lg transition-all"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Toolbar */}
        {selectedContacts.size > 0 && (
          <div style={{ margin: "16px 24px", background: "#1e1e36", border: "1px solid #2a2a44", borderRadius: "12px", padding: "16px" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-[#F1F5F9]">
                  {selectedContacts.size} contact{selectedContacts.size > 1 ? 's' : ''} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedContacts(new Set())}
                  className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] underline"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#161625] text-[#CBD5E1] font-semibold rounded-lg border-2 border-[#2a2a44] hover:border-indigo-500 transition-all"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span>Export Selected</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete Selected</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contacts Table */}
        <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#161625', color: '#F1F5F9' }}>
            <thead>
              <tr>
                <th style={{ padding: "10px 16px", background: "#12121f", borderBottom: "1px solid #2a2a44", width: "48px" }}>
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selectedContacts.size === contacts.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-[#2a2a44] text-indigo-400 focus:ring-indigo-500 cursor-pointer"
                    title="Select all contacts"
                  />
                </th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", background: "#12121f", borderBottom: "1px solid #2a2a44" }}>Contact</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", background: "#12121f", borderBottom: "1px solid #2a2a44" }}>Role</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", background: "#12121f", borderBottom: "1px solid #2a2a44" }}>Company</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", background: "#12121f", borderBottom: "1px solid #2a2a44" }}>Status</th>
                {/* Dynamic custom field columns */}
                {customFieldKeys.map(key => (
                  <th key={key} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", background: "#12121f", borderBottom: "1px solid #2a2a44" }}>{key}</th>
                ))}
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", background: "#12121f", borderBottom: "1px solid #2a2a44" }}>Phone</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", background: "#12121f", borderBottom: "1px solid #2a2a44" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={7 + customFieldKeys.length} style={{ padding: "64px 16px", textAlign: "center", borderBottom: "1px solid #1e1e36", color: "#94A3B8" }}>
                    {searchTerm || statusFilter ? (
                      // No results found state (when filters are active)
                      <>
                        <MagnifyingGlassIcon className="h-16 w-16 text-[#64748B] mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">No contacts found</h3>
                        <p className="text-sm text-[#94A3B8] mb-6">
                          Try adjusting your search or filters to find what you're looking for
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('');
                          }}
                          className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 mx-auto`}
                        >
                          <XMarkIcon className="h-5 w-5" />
                          Clear Filters
                        </button>
                      </>
                    ) : (
                      // No data uploaded state (when no filters are active)
                      <>
                        <UserIcon className="h-16 w-16 text-[#64748B] mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">No Data Uploaded</h3>
                        <p className="text-sm text-[#94A3B8] mb-6">Get started by adding contacts or importing from CSV</p>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={handleAddContact}
                            className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5`}
                          >
                            <PlusIcon className="h-5 w-5" />
                            Add Contact
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAICSVImport(true)}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-6 py-3 rounded-xl border border-indigo-500/30 transition-all duration-200 flex items-center gap-2 shadow-lg hover:scale-105"
                          >
                            <DocumentArrowUpIcon className="h-5 w-5" />
                            Import CSV
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map(([companyName, companyContacts]) => {
                  const isExpanded = expandedCompanies.has(companyName);
                  const hasMultipleContacts = companyContacts.length > 1;
                  const displayContact = companyContacts[0];

                  return (
                    <React.Fragment key={companyName}>
                      {/* Company header row with first contact */}
                      <tr style={{ background: '#161625', cursor: 'pointer' }}>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", width: "48px" }}>
                          <input
                            type="checkbox"
                            checked={selectedContacts.has(displayContact.id)}
                            onChange={() => toggleContactSelection(displayContact.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-[#2a2a44] text-indigo-400 focus:ring-indigo-500 cursor-pointer"
                            aria-label={`Select ${displayContact.firstName} ${displayContact.lastName}`}
                          />
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                          <div className="flex items-center space-x-3">
                            {hasMultipleContacts && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCompany(companyName);
                                }}
                                style={{ padding: "4px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer" }}
                              >
                                {isExpanded ? (
                                  <ChevronDownIcon className="h-4 w-4 text-[#94A3B8]" />
                                ) : (
                                  <ChevronRightIcon className="h-4 w-4 text-[#94A3B8]" />
                                )}
                              </button>
                            )}
                            <div
                              style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #252540, #2d2d4a)', border: '1px solid #3d3d5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#A5B4FC', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                              onClick={() => navigate(`/contacts/${displayContact.id}`)}
                            >
                              {displayContact.firstName?.[0] || '?'}{displayContact.lastName?.[0] || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-[#F1F5F9] cursor-pointer hover:text-indigo-400" onClick={() => navigate(`/contacts/${displayContact.id}`)}>
                                {displayContact.firstName || 'No'} {displayContact.lastName || 'Name'}
                                {hasMultipleContacts && (
                                  <span className="ml-2 text-xs text-[#94A3B8]">
                                    +{companyContacts.length - 1} more
                                  </span>
                                )}
                              </div>
                              <div className="text-[#94A3B8] text-sm flex items-center">
                                <EnvelopeIcon className="h-4 w-4 mr-1" />
                                {displayContact.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                          {displayContact.role ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              {displayContact.role}
                            </span>
                          ) : (
                            <span className="text-[#64748B]">-</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                          <div className="flex items-center gap-2">
                            <BuildingOfficeIcon className="h-4 w-4 text-[#94A3B8]" />
                            <span className="font-medium text-[#F1F5F9]">{companyName}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                          <span className={statusColors[displayContact.status]}>
                            {displayContact.status.replace('_', ' ')}
                          </span>
                        </td>
                        {/* Dynamic Custom Fields */}
                        {customFieldKeys.map(key => (
                          <td key={key} style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                            {displayContact.customFields?.[key] ? (
                              <span className={`text-sm ${
                                key.toLowerCase().includes('intent') || key.toLowerCase().includes('hiring')
                                  ? `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      displayContact.customFields[key]?.toString().toLowerCase().includes('yes')
                                        ? 'bg-green-500/15 text-green-400'
                                        : displayContact.customFields[key]?.toString().toLowerCase().includes('no')
                                        ? 'bg-red-500/15 text-red-400'
                                        : 'bg-yellow-500/15 text-yellow-400'
                                    }`
                                  : key.toLowerCase().includes('budget')
                                  ? 'font-medium text-[#F1F5F9]'
                                  : 'text-[#CBD5E1]'
                              }`}>
                                {displayContact.customFields[key]}
                              </span>
                            ) : (
                              <span className="text-[#64748B]">-</span>
                            )}
                          </td>
                        ))}
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                          {displayContact.phone ? (
                            <div className="flex items-center text-[#F1F5F9]">
                              <PhoneIcon className="h-4 w-4 mr-1" />
                              {displayContact.phone}
                            </div>
                          ) : (
                            <span className="text-[#64748B]">-</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditContact(displayContact);
                              }}
                              style={{ padding: "8px", borderRadius: "8px", background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8" }}
                              title="Edit contact"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContact(displayContact.id);
                              }}
                              style={{ padding: "8px", borderRadius: "8px", background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8" }}
                              title="Delete contact"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded additional contacts */}
                      {isExpanded && hasMultipleContacts && companyContacts.slice(1).map((contact) => (
                        <tr
                          key={contact.id}
                          style={{ background: "rgba(18,18,31,0.5)" }}
                        >
                          <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                            <div className="flex items-center space-x-3 pl-12">
                              <div
                                style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #252540, #2d2d4a)', border: '1px solid #3d3d5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#A5B4FC', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                                onClick={() => navigate(`/contacts/${contact.id}`)}
                              >
                                {contact.firstName?.[0] || '?'}{contact.lastName?.[0] || '?'}
                              </div>
                              <div>
                                <div className="font-medium text-[#F1F5F9] cursor-pointer hover:text-indigo-400" onClick={() => navigate(`/contacts/${contact.id}`)}>
                                  {contact.firstName || 'No'} {contact.lastName || 'Name'}
                                </div>
                                <div className="text-[#94A3B8] text-sm flex items-center">
                                  <EnvelopeIcon className="h-4 w-4 mr-1" />
                                  {contact.email || 'No email'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                            {contact.role ? (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                {contact.role}
                              </span>
                            ) : (
                              <span className="text-[#64748B]">-</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                            <span className="text-[#64748B] text-sm">↳ Same company</span>
                          </td>
                          <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                            <span className={statusColors[contact.status]}>
                              {contact.status.replace('_', ' ')}
                            </span>
                          </td>
                          {/* Dynamic Custom Fields */}
                          {customFieldKeys.map(key => (
                            <td key={key} style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                              {contact.customFields?.[key] ? (
                                <span className={`text-sm ${
                                  key.toLowerCase().includes('intent') || key.toLowerCase().includes('hiring')
                                    ? `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        contact.customFields[key]?.toString().toLowerCase().includes('yes')
                                          ? 'bg-green-500/15 text-green-400'
                                          : contact.customFields[key]?.toString().toLowerCase().includes('no')
                                          ? 'bg-red-500/15 text-red-400'
                                          : 'bg-yellow-500/15 text-yellow-400'
                                      }`
                                    : key.toLowerCase().includes('budget')
                                    ? 'font-medium text-[#F1F5F9]'
                                    : 'text-[#CBD5E1]'
                                }`}>
                                  {contact.customFields[key]}
                                </span>
                              ) : (
                                <span className="text-[#64748B]">-</span>
                              )}
                            </td>
                          ))}
                          <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                            {contact.phone ? (
                              <div className="flex items-center text-[#F1F5F9]">
                                <PhoneIcon className="h-4 w-4 mr-1" />
                                {contact.phone}
                              </div>
                            ) : (
                              <span className="text-[#64748B]">-</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditContact(contact);
                                }}
                                style={{ padding: "8px", borderRadius: "8px", background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8" }}
                                title="Edit contact"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteContact(contact.id);
                                }}
                                style={{ padding: "8px", borderRadius: "8px", background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8" }}
                                title="Delete contact"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCompanies > 0 && (
          <div className="border-t-2 border-[#2a2a44] px-6 py-5 flex items-center justify-between bg-[#12121f]">
            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold text-[#CBD5E1]">
                Showing {startIndex} to {endIndex} of {totalCompanies} companies ({totalContacts} contacts total)
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="contactsPerPage" className="text-sm text-[#94A3B8]">
                  Show:
                </label>
                <select
                  id="contactsPerPage"
                  value={contactsPerPage}
                  onChange={(e) => {
                    setContactsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  style={{ background: '#252540', border: '1px solid #3d3d5c', borderRadius: '8px', color: '#F1F5F9', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
                <span className="text-sm text-[#94A3B8]">companies per page</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Previous
              </button>
              <span className="text-sm font-semibold text-[#CBD5E1] px-3">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Next
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Contact Form Modal */}
      {showModal && (
        <ContactForm
          contact={editingContact}
          companies={companies}
          onClose={handleModalClose}
        />
      )}

      {/* Commented out modal components - uncomment when needed */}
      {/* Apollo Import Modal */}
      {/* <ApolloImportModal
        isOpen={showApolloImport}
        onClose={() => setShowApolloImport(false)}
        onImportComplete={() => {
          setShowApolloImport(false);
          loadContacts();
        }}
      /> */}

      {/* AI CSV Import Modal */}
      <CSVImportModal
        isOpen={showAICSVImport}
        onClose={() => setShowAICSVImport(false)}
        onImportComplete={() => {
          setShowAICSVImport(false);
          loadContacts();
        }}
      />

      {/* Lead Discovery Modal */}
      {showLeadDiscovery && (
        <LeadDiscoveryModal
          mode="individual"
          onClose={() => setShowLeadDiscovery(false)}
          onImport={() => {
            loadContacts();
          }}
        />
      )}

      {/* Duplicates Modal */}
      {showDuplicates && duplicateGroups.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" style={{ paddingLeft: '272px', paddingTop: '16px', paddingRight: '16px', paddingBottom: '16px' }}>
          <div className="bg-[#161625] rounded-2xl shadow-2xl border border-[#2a2a44] max-w-3xl w-full max-h-[85vh] flex flex-col">
            {/* Header — fixed */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
              <h2 className="text-lg font-bold text-white">
                {duplicateGroups.reduce((sum, group) => sum + group.length, 0)} Duplicates in {duplicateGroups.length} Group{duplicateGroups.length !== 1 ? 's' : ''}
              </h2>
              <button
                type="button"
                onClick={() => setShowDuplicates(false)}
                className="text-white hover:bg-[#161625]/20 rounded-lg p-2 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Quick actions — fixed */}
            <div className="px-6 py-3 bg-[#12121f] border-b border-[#2a2a44] flex items-center justify-between flex-shrink-0">
              <p className="text-[#94A3B8] text-xs">
                Check contacts to delete, uncheck to keep
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const all = new Set<string>();
                    duplicateGroups.forEach(group => {
                      group.slice(1).forEach(c => all.add(c.id));
                    });
                    setSelectedContacts(all);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-indigo-400 border border-indigo-500/30 rounded-md hover:bg-indigo-500/10 transition-colors"
                >
                  Select All Duplicates
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedContacts(new Set())}
                  className="px-3 py-1.5 text-xs font-medium text-[#94A3B8] border border-[#3d3d5c] rounded-md hover:bg-[#1e1e36] transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-4" style={{ maxHeight: 'calc(85vh - 200px)' }}>
              <p className="text-amber-400 text-xs mb-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                First contact in each group is the original. Others are duplicates — select and delete them.
              </p>
              {duplicateGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="mb-4 border border-[#2a2a44] rounded-lg overflow-hidden">
                  <div className="bg-[#1e1e36] px-4 py-2.5 border-b border-[#2a2a44] flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-[#F1F5F9]">
                      Group {groupIndex + 1} — {group.length} contacts
                    </h3>
                    <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                      {group[0]?.email && group.every(c => c.email?.toLowerCase() === group[0].email?.toLowerCase())
                        ? `Same email: ${group[0].email}`
                        : group[0]?.phone && group.every(c => c.phone?.replace(/\D/g, '') === group[0].phone?.replace(/\D/g, ''))
                        ? `Same phone: ${group[0].phone}`
                        : `Same name at ${group[0]?.company?.name || 'same company'}`
                      }
                    </span>
                  </div>
                  <div className="divide-y divide-[#2a2a44]">
                    {group.map((contact, contactIdx) => {
                      const isOriginal = contactIdx === 0;
                      const isChecked = selectedContacts.has(contact.id);
                      return (
                        <div key={contact.id} className={`flex items-center gap-3 px-4 py-3 ${isOriginal ? 'bg-green-500/5' : 'bg-[#161625]'} hover:bg-[#1e1e36] transition-colors`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleContactSelection(contact.id)}
                            className="w-4 h-4 rounded border-[#3d3d5c] text-indigo-500 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#F1F5F9] text-sm">
                                {contact.firstName} {contact.lastName}
                              </span>
                              {isOriginal && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500/15 text-green-400 rounded">KEEP</span>
                              )}
                              {!isOriginal && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 rounded">DUPLICATE</span>
                              )}
                            </div>
                            <div className="text-xs text-[#94A3B8] mt-0.5">
                              {contact.email}{contact.phone && ` • ${contact.phone}`}{contact.company && ` • ${contact.company.name}`}
                            </div>
                          </div>
                          {!isOriginal && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Delete ${contact.firstName} ${contact.lastName}?`)) {
                                  try {
                                    const token = localStorage.getItem('crmToken');
                                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                                    await fetch(`${apiUrl}/api/contacts/${contact.id}`, {
                                      method: 'DELETE',
                                      headers: { 'Authorization': `Bearer ${token}` },
                                    });
                                    // Remove from group
                                    setDuplicateGroups(prev => prev.map(g => g.filter(c => c.id !== contact.id)).filter(g => g.length > 1));
                                    loadContacts();
                                  } catch { /* ignore */ }
                                }
                              }}
                              className="px-2 py-1 text-xs font-medium text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors flex-shrink-0"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#2a2a44] px-6 py-4 bg-[#12121f] flex items-center justify-between">
              <div className="text-sm text-[#94A3B8]">
                {selectedContacts.size} selected for removal
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDuplicates(false)}
                  className="px-5 py-2.5 border border-[#3d3d5c] rounded-lg font-medium text-[#94A3B8] hover:bg-[#1e1e36] hover:text-[#F1F5F9] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedContacts.size === 0) {
                      alert('Please select contacts to delete');
                      return;
                    }
                    await handleBulkDelete();
                    setShowDuplicates(false);
                  }}
                  disabled={selectedContacts.size === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Selected ({selectedContacts.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Guide */}
      {showHelpGuide && (
        <ContactsHelpGuide onClose={() => setShowHelpGuide(false)} />
      )}

      {/* Floating Help Button - Subtle and Small */}
      <button
        type="button"
        onClick={() => setShowHelpGuide(true)}
        className="fixed bottom-6 right-6 z-40 group"
        title="Need help? Click for the quick start guide"
        aria-label="Open help guide"
      >
        {/* Main button - smaller and subtle */}
        <div className="relative bg-[#161625] hover:bg-[#12121f] rounded-full p-2 shadow-lg border-2 border-[#2a2a44] hover:border-indigo-500 hover:scale-105 transition-all duration-200">
          <QuestionMarkCircleIcon className="w-5 h-5 text-[#94A3B8] group-hover:text-indigo-400" />
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          <div className="bg-black text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-xl">
            Need Help? 👋
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-black"></div>
          </div>
        </div>
      </button>
    </div>
  );
}