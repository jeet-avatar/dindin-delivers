import { useState, useEffect } from 'react';
import { XMarkIcon, UserCircleIcon, BuildingOfficeIcon, TagIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { contactsApi, companiesApi, tagsApi } from '../../services/api';
import { validatePhoneNumber, validateEmail } from '../../utils/validation';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: {
    id: string;
    name: string;
  };
  status: 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'COLD' | 'WARM' | 'HOT' | 'CLOSED_WON' | 'CLOSED_LOST';
  tags: { id: string; name: string; color: string }[];
}

interface Company {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ContactFormProps {
  contact?: Contact | null;
  companies: Company[];
  onClose: () => void;
}

export function ContactForm({ contact, companies: companiesProp, onClose }: ContactFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    companyId: '',
    companyName: '',
    status: 'LEAD' as 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'COLD' | 'WARM' | 'HOT' | 'CLOSED_WON' | 'CLOSED_LOST',
    tagIds: [] as string[],
  });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>(companiesProp || []);
  const [companySearch, setCompanySearch] = useState('');
  const [companySuggestions, setCompanySuggestions] = useState<Company[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load companies if not provided via prop
  useEffect(() => {
    if (companiesProp.length === 0) {
      companiesApi.getAll().then((res: any) => setCompanies(res.companies || [])).catch(() => {});
    } else {
      setCompanies(companiesProp);
    }
  }, [companiesProp]);

  // Company autocomplete — filter as user types
  useEffect(() => {
    if (companySearch.length >= 1) {
      const filtered = companies.filter(c =>
        c.name.toLowerCase().includes(companySearch.toLowerCase())
      ).slice(0, 8);
      setCompanySuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setCompanySuggestions([]);
      setShowSuggestions(false);
    }
  }, [companySearch, companies]);

  // Load form data when contact changes
  useEffect(() => {
    if (contact && contact.id !== 'new') {
      setFormData({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone || '',
        role: (contact as any).role || '',
        companyId: contact.company?.id || '',
        companyName: '',
        status: contact.status,
        tagIds: contact.tags.map(tag => tag.id),
      });
      setCompanySearch(contact.company?.name || '');
    } else if (contact && contact.id === 'new') {
      // New contact with pre-selected company
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        companyId: contact.company?.id || '',
        status: 'LEAD',
        tagIds: [],
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        companyId: '',
        status: 'LEAD',
        tagIds: [],
      });
    }
  }, [contact]);

  // Load available tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await tagsApi.getAll();
        setAvailableTags(response.tags || []);
      } catch (err) {
        console.error('Error loading tags:', err);
      }
    };
    loadTags();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    // Frontend validation
    if (!formData.firstName.trim()) {
      setError('First name is required');
      setLoading(false);
      return;
    }

    if (!formData.lastName.trim()) {
      setError('Last name is required');
      setLoading(false);
      return;
    }

    // Validate email if provided
    if (formData.email && formData.email.trim()) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        setError(emailValidation.error || 'Invalid email address');
        setLoading(false);
        return;
      }
    }

    // Validate phone number if provided
    if (formData.phone && formData.phone.trim()) {
      const phoneValidation = validatePhoneNumber(formData.phone);
      if (!phoneValidation.isValid) {
        setError(phoneValidation.error || 'Invalid phone number');
        setLoading(false);
        return;
      }
    }

    try {
      const submitData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        role: formData.role.trim() || undefined,
        companyId: formData.companyId || undefined,
        companyName: formData.companyName.trim() || undefined, // NEW: Send company name for auto-creation
        status: formData.status,
        tagIds: formData.tagIds,
      };

      console.log('Submitting contact data:', submitData);
      console.log('Contact object:', contact);
      console.log('Contact ID check:', contact?.id, 'Is new?', contact?.id === 'new');

      // Check if this is an UPDATE (existing contact with valid ID that's not 'new')
      if (contact && contact.id && contact.id !== 'new') {
        console.log('Updating existing contact with ID:', contact.id);
        const result = await contactsApi.update(contact.id, submitData);
        console.log('Contact updated:', result);
      } else {
        // This is a CREATE (new contact or contact with id='new')
        console.log('Creating new contact');
        const result = await contactsApi.create(submitData);
        console.log('Contact created:', result);
      }

      // Close modal first (triggers loadContacts refresh), then show non-blocking success
      onClose();
      setTimeout(() => {
        // Non-blocking notification — doesn't block the UI refresh
      }, 100);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to save contact';

      // Provide user-friendly error message for duplicate email
      if (errorMessage.includes('Unique constraint') && errorMessage.includes('email')) {
        setError(`This email address is already in use. Please use a different email or leave it blank.`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }));
  };

  const statusOptions = [
    { value: 'LEAD', label: 'Lead', color: 'bg-orange-500/15 text-orange-400' },
    { value: 'PROSPECT', label: 'Prospect', color: 'bg-rose-500/15 text-rose-400' },
    { value: 'CUSTOMER', label: 'Customer', color: 'bg-green-500/15 text-green-400' },
    { value: 'COLD', label: 'Cold', color: 'bg-gray-100 text-gray-700' },
    { value: 'WARM', label: 'Warm', color: 'bg-yellow-500/15 text-yellow-400' },
    { value: 'HOT', label: 'Hot', color: 'bg-red-500/15 text-red-400' },
    { value: 'CLOSED_WON', label: 'Closed Won', color: 'bg-emerald-500/15 text-emerald-400' },
    { value: 'CLOSED_LOST', label: 'Closed Lost', color: 'bg-slate-500/15 text-slate-400' },
  ];

  return (
    <div style={{ background: "rgba(0,0,0,0.8)" }} className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div style={{ background: "#161625", border: "1px solid #2a2a44" }} className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 px-8 py-6 rounded-t-[40px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {contact ? 'Edit Contact' : 'Add New Contact'}
              </h2>
              <p className="text-white/90 text-sm mt-1">
                {contact ? 'Update contact information' : 'Create a new contact in your CRM'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-8">
            {error && (
              <div className="bg-red-500/10 border-l-4 border-red-500 text-red-400 px-6 py-4 rounded-r-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}

            {/* Personal Information Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <UserCircleIcon className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-gray-400 text-xs">(optional, must be unique)</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="john.doe@example.com (leave blank if unknown)"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="(555) 123-4567 or +1-555-123-4567"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Formats: (555) 123-4567, 555-123-4567, +1-555-123-4567, +44 20 1234 5678
                  </p>
                </div>
              </div>
            </div>

            {/* Professional Details Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">Professional Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select Role</option>
                    <option value="CEO">CEO</option>
                    <option value="CFO">CFO</option>
                    <option value="CTO">CTO</option>
                    <option value="COO">COO</option>
                    <option value="CMO">CMO</option>
                    <option value="CIO">CIO</option>
                    <option value="VP Sales">VP Sales</option>
                    <option value="VP Marketing">VP Marketing</option>
                    <option value="VP Product">VP Product</option>
                    <option value="VP Engineering">VP Engineering</option>
                    <option value="Director">Director</option>
                    <option value="Manager">Manager</option>
                    <option value="Controller">Controller</option>
                    <option value="IT Director">IT Director</option>
                    <option value="Sales Rep">Sales Rep</option>
                    <option value="Account Manager">Account Manager</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="company"
                      placeholder="Start typing company name..."
                      value={companySearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompanySearch(val);
                        setFormData(prev => ({ ...prev, companyId: '', companyName: val }));
                      }}
                      onFocus={() => { if (companySearch.length >= 1) setShowSuggestions(true); }}
                      onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    />
                    {/* Autocomplete dropdown */}
                    {showSuggestions && companySuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {companySuggestions.map((company) => (
                          <button
                            key={company.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData(prev => ({ ...prev, companyId: company.id, companyName: '' }));
                              setCompanySearch(company.name);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-gray-900 text-sm border-b border-gray-100 last:border-0 transition-colors"
                          >
                            {company.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.companyName && !formData.companyId && companySearch.length > 0 && companySuggestions.length === 0 && (
                    <p className="mt-2 text-xs text-green-400">
                      ✨ New company "{formData.companyName}" will be created
                    </p>
                  )}
                  {formData.companyId && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-indigo-500">✓ {companies.find(c => c.id === formData.companyId)?.name}</span>
                      <button type="button" onClick={() => { setFormData(prev => ({ ...prev, companyId: '', companyName: '' })); setCompanySearch(''); }} className="text-xs text-gray-400 hover:text-red-400">✕ clear</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FunnelIcon className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">Status</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: option.value as any }))}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                      formData.status === option.value
                        ? `${option.color} border-current shadow-md scale-105`
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Section */}
            {availableTags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TagIcon className="h-5 w-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Tags</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all duration-200 ${
                        formData.tagIds.includes(tag.id)
                          ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400 shadow-sm'
                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-300 px-8 py-6 bg-gray-50">
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit as any}
                className="inline-flex items-center gap-2 px-8 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  (contact && contact.id !== 'new') ? 'Update Contact' : 'Create Contact'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
