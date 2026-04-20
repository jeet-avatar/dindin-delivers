import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DOMPurify from 'dompurify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselect?: { subject: string; campaignType: string } | null;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  phone?: string;
}

interface Company {
  id: string;
  name: string;
  industry?: string;
  vertical?: string;  // normalized backend vertical
  _count: { contacts: number };
  contacts?: Contact[];
}

interface Vertical {
  name: string;
  count: number;
  totalContacts: number;
}

interface StaffingTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  id?: string;
  color?: string;
  subjects?: string[];
}

interface SendResult {
  success: boolean;
  sent: number;
  total: number;
  failed: number;
  mode: string;
  message: string;
  recipients: { email: string; name: string; company: string }[];
}

const EMOJIS = ['🏢', '🏬', '🏭', '🏪', '🏫'];

export function CampaignWizard({ isOpen, onClose, onSuccess, preselect }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'persuasive'>('professional');
  const [generating, setGenerating] = useState(false);
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [fromAddress, setFromAddress] = useState('');
  const [editingFrom, setEditingFrom] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [contentSource, setContentSource] = useState<'ai' | 'template' | 'staffing'>('ai');
  const [templates, setTemplates] = useState<{ id: string; name: string; subject: string; htmlContent: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [staffingTemplates, setStaffingTemplates] = useState<StaffingTemplate[]>([]);
  const [selectedStaffingIdx, setSelectedStaffingIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [sentContactIds, setSentContactIds] = useState<Set<string>>(new Set());
  const [sendSpeed, setSendSpeed] = useState<number>(5); // minutes between emails
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendCampaignId, setSendCampaignId] = useState<string>('');
  const [sendProgress, setSendProgress] = useState<{ status: string; sent: number; failed: number; total: number; remaining: number; nextSendInSeconds: number } | null>(null);
  const [verticalFilter, setVerticalFilter] = useState<string>('all');
  const [verticals, setVerticals] = useState<Vertical[]>([]);

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Email validation — only contacts with valid emails are selectable
  const isValidEmail = (email?: string) => !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isSelectable = (contact: Contact) => isValidEmail(contact.email) && !sentContactIds.has(contact.id);

  // Normalize industry to clean vertical (mirrors backend normalizeVertical)
  const getVertical = (industry?: string | null): string => {
    if (!industry) return 'Uncategorized';
    const l = industry.toLowerCase().trim();
    if (/saas|software|app dev|enterprise software|productivity/i.test(l)) return 'Software & SaaS';
    if (/cyber|security|identity|infosec/i.test(l)) return 'Cybersecurity';
    if (/ai|ml|machine learning|data science|big data|data analytics|data eng|database/i.test(l)) return 'AI & Data';
    if (/cloud|devops|platform|hosting|infrastructure/i.test(l)) return 'Cloud & Infrastructure';
    if (/health|medical|pharma|biotech|hospital|wellness|diagnostics/i.test(l)) return 'Healthcare & Life Sciences';
    if (/fintech|banking|finance|insurance|payment|lending|mortgage/i.test(l)) return 'Financial Services';
    if (/retail|e-?commerce|consumer goods|beauty|fashion|apparel|food.*bev|restaurant|grocery/i.test(l)) return 'Retail & Consumer';
    if (/manufactur|industrial|automotive|aerospace|construction|engineering|energy|chemical/i.test(l)) return 'Manufacturing & Industrial';
    if (/educat|edtech|e-?learn|training|school/i.test(l)) return 'Education';
    if (/consult|professional serv|staffing|recruit|hr |human resource/i.test(l)) return 'Consulting & Staffing';
    if (/media|entertain|gaming|music|publish|advertis|marketing|pr\b/i.test(l)) return 'Media & Marketing';
    if (/telecom|network|iot|semiconductor|hardware|electronics/i.test(l)) return 'Telecom & Hardware';
    if (/logistics|transport|supply chain|shipping|warehouse/i.test(l)) return 'Logistics & Supply Chain';
    if (/non-?profit|ngo|social|civic|charity|foundation/i.test(l)) return 'Non-Profit';
    if (/real estate|property|housing/i.test(l)) return 'Real Estate';
    if (/legal|law|government|public/i.test(l)) return 'Legal & Government';
    if (/it |it$|information tech|tech serv|tech$|technology$/i.test(l)) return 'IT Services';
    if (/travel|hospitality|hotel|tourism|airline/i.test(l)) return 'Travel & Hospitality';
    return 'Other';
  };

  // Load user email on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('crmUser');
      if (raw) {
        const user = JSON.parse(raw);
        setFromAddress(user.email || '');
      }
    } catch {
      // ignore
    }
  }, []);

  // Poll send progress every 10 seconds (Step 4)
  useEffect(() => {
    if (!sendCampaignId || sendProgress?.status === 'complete') return;
    const token = localStorage.getItem('crmToken');
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/campaigns/${sendCampaignId}/send-progress`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSendProgress(data);
        }
      } catch { /* ignore */ }
    };
    const timer = setInterval(poll, 10000);
    return () => clearInterval(timer);
  }, [sendCampaignId, sendProgress?.status]);

  // Load companies + templates when wizard opens
  useEffect(() => {
    if (isOpen) {
      loadCompanies();
      loadTemplates();
      loadStaffingTemplates();
      // Fetch contacts already sent any campaign
      (async () => {
        try {
          const token = localStorage.getItem('crmToken');
          const res = await fetch(`${API_URL}/api/campaigns/sent-contact-ids`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setSentContactIds(new Set(data.sentContactIds || []));
          }
        } catch { /* ignore — badges just won't show */ }
      })();
      // Reset state for fresh wizard
      setStep(1);
      setSendResult(null);
      setShowPreview(false);
      setError('');

      // Check for follow-up campaign data
      try {
        const followUpRaw = sessionStorage.getItem('followUpCampaign');
        if (followUpRaw) {
          const followUp = JSON.parse(followUpRaw);
          sessionStorage.removeItem('followUpCampaign');
          if (followUp.isFollowUp) {
            setCampaignName(`Follow-up: ${followUp.originalName}`);
            setSubject(`Re: ${followUp.originalSubject}`);
            setEmailBody(`<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
  <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;'>
    <h1 style='color: #ffffff; margin: 0; font-size: 22px;'>Follow-up: ${followUp.originalName}</h1>
    <p style='color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;'>Following up on our previous outreach</p>
  </div>
  <div style='padding: 24px; background: #ffffff; color: #333;'>
    <p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
    <p style='font-size: 15px; line-height: 1.6;'>I wanted to follow up on my previous email about technology staffing for {{companyName}}.</p>
    <p style='font-size: 15px; line-height: 1.6;'>I understand how busy things can get, so I\\'ll keep this brief — we still have <strong>pre-vetted engineers</strong> ready for immediate engagement across AI/ML, Cloud, Full-Stack, and DevOps.</p>
    <p style='font-size: 15px; line-height: 1.6;'>Would a quick 10-minute call this week work for you?</p>
    <div style='text-align: center; margin: 24px 0;'>
      <a href='#' style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;'>Schedule a Quick Call</a>
    </div>
    <p style='font-size: 15px; line-height: 1.6;'>Best regards,<br/><strong>Zietra Staffing Team</strong></p>
  </div>
</div>`);
            setContentSource('staffing');
          }
        }
      } catch {
        // ignore
      }

      // Pre-select template + subject from hot campaign banner
      if (preselect) {
        setSubject(preselect.subject);
        setContentSource('staffing');
        // Load the matching template from the API
        const token = localStorage.getItem('crmToken');
        const apiUrl = import.meta.env.VITE_API_URL || '';
        fetch(`${apiUrl}/api/campaigns/all-templates`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then(r => r.json()).then(data => {
          const tmpl = data.templates?.find((t: any) => t.id === preselect.campaignType);
          if (tmpl) {
            setCampaignName(`${tmpl.name} Campaign`);
          }
        }).catch(() => {});
        // Skip to step 2 (company selection) since template + subject are pre-loaded
        // Content will be loaded from staffing templates
      }
    }
  }, [isOpen, preselect]);

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(`${API_URL}/api/email-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.templates || data || [];
        setTemplates(Array.isArray(list) ? list : []);
      }
    } catch {
      // silently fail
    }
  };

  const loadCompanies = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(`${API_URL}/api/companies?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.companies || data.data || [];
        // Tag each company with normalized vertical + sort by emailable contact count
        list.forEach((c: any) => { c.vertical = getVertical(c.industry); });
        list.sort((a: any, b: any) => {
          const aEmail = (a.contacts || []).filter((c: any) => isValidEmail(c.email)).length;
          const bEmail = (b.contacts || []).filter((c: any) => isValidEmail(c.email)).length;
          return bEmail - aEmail;
        });
        setCompanies(list);

        // Build vertical summary from loaded companies
        const vMap = new Map<string, { count: number; totalContacts: number; emailContacts: number }>();
        list.forEach((c: any) => {
          const v = c.vertical || 'Uncategorized';
          const existing = vMap.get(v) || { count: 0, totalContacts: 0, emailContacts: 0 };
          existing.count++;
          existing.totalContacts += c._count?.contacts || 0;
          existing.emailContacts += (c.contacts || []).filter((ct: any) => isValidEmail(ct.email)).length;
          vMap.set(v, existing);
        });
        const vList = Array.from(vMap.entries())
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.emailContacts - a.emailContacts);
        setVerticals(vList);
      }
    } catch {
      // silently fail — empty state handled below
    }
  };

  const loadStaffingTemplates = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      // Load our 8 campaign templates with HTML content
      const res = await fetch(`${API_URL}/api/campaigns/all-templates?html=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const templates = (data.templates || [])
          .filter((t: any) => !t.wip) // Hide WIP templates
          .map((t: any) => ({
            name: t.name,
            subject: t.subjects[0] || '',
            htmlContent: t.htmlContent || '',
            color: t.color,
            id: t.id,
            subjects: t.subjects,
          }));
        setStaffingTemplates(templates);
      }
    } catch {
      // Silently fail — templates are optional
    }
  };

  const seedStaffingCompanies = async () => {
    setSeeding(true);
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(`${API_URL}/api/staffing/seed-companies`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSeedDone(true);
        await loadCompanies(); // Reload companies after seeding
      }
    } catch {
      // Silently fail
    } finally {
      setSeeding(false);
    }
  };

  const runGeneration = async () => {
    setGenerating(true);
    setGenerateError('');
    const token = localStorage.getItem('crmToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    try {
      // Step A: generate-basics
      const basicsRes = await fetch(`${API_URL}/api/campaigns/ai/generate-basics`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tone, description: prompt }),
      });
      if (!basicsRes.ok) throw new Error('Failed to generate campaign basics');
      const basicsData = await basicsRes.json();
      setCampaignName(basicsData.name);
      setCampaignGoal(basicsData.goal);

      // Step B: generate-subject
      const subjectRes = await fetch(`${API_URL}/api/campaigns/ai/generate-subject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ goal: basicsData.goal, tone, campaignName: basicsData.name }),
      });
      if (!subjectRes.ok) throw new Error('Failed to generate subject line');
      const subjectData = await subjectRes.json();
      setSubject(subjectData.variants[0]);

      // Step C: generate-content
      const contentRes = await fetch(`${API_URL}/api/campaigns/ai/generate-content`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal: basicsData.goal,
          subject: subjectData.variants[0],
          tone,
          personalization: true,
        }),
      });
      if (!contentRes.ok) throw new Error('Failed to generate email content');
      const contentData = await contentRes.json();
      setEmailBody(contentData.content);
    } catch (err: any) {
      setGenerateError(err.message || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError('');
    const token = localStorage.getItem('crmToken');
    if (!token) {
      setError('Not logged in. Please refresh and log in again.');
      setSending(false);
      return;
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    try {
      // Step 1: Create campaign
      const createRes = await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: campaignName || `Staffing Campaign - ${new Date().toLocaleDateString()}`,
          subject,
          status: 'DRAFT',
          htmlContent: emailBody,
        }),
      });
      const createData = await createRes.json().catch(() => null);
      if (!createRes.ok || !createData?.campaign?.id) {
        throw new Error(createData?.error || createData?.message || `Server returned ${createRes.status}. Please try again.`);
      }
      const campaignId = createData.campaign.id;

      // Step 2: Link companies (continue even if some fail)
      let linkedCount = 0;
      for (const companyId of selectedCompanyIds) {
        try {
          const linkRes = await fetch(`${API_URL}/api/campaigns/${campaignId}/companies/${companyId}`, {
            method: 'POST',
            headers,
          });
          if (linkRes.ok) linkedCount++;
        } catch {
          // Skip failed links, continue
        }
      }

      // Step 3: Start throttled send
      const sendRes = await fetch(`${API_URL}/api/campaigns/${campaignId}/send-throttled`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ intervalMinutes: sendSpeed }),
      });
      const sendData = await sendRes.json().catch(() => null);

      if (!sendRes.ok) {
        throw new Error(sendData?.error || 'Failed to start campaign send');
      }

      setSendCampaignId(campaignId);
      setSendResult({
        success: true,
        sent: 1,
        total: sendData?.total || totalSelectedContacts,
        failed: 0,
        mode: 'throttled',
        message: sendData?.message || `Sending ${totalSelectedContacts} emails, 1 every ${sendSpeed} min.`,
        recipients: [],
      });
      setSendProgress({
        status: 'sending',
        sent: 1,
        failed: 0,
        total: sendData?.total || totalSelectedContacts,
        remaining: (sendData?.total || totalSelectedContacts) - 1,
        nextSendInSeconds: sendSpeed * 60,
      });
      setStep(4 as any);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const toggleCompany = (id: string) => {
    setSelectedCompanyIds(prev => {
      if (prev.includes(id)) {
        // Deselecting company — also remove its contacts from selection
        const company = companies.find(c => c.id === id);
        if (company?.contacts) {
          setSelectedContactIds(prevContacts => {
            const next = new Set(prevContacts);
            company.contacts!.forEach(c => next.delete(c.id));
            return next;
          });
        }
        return prev.filter(c => c !== id);
      } else {
        // Selecting company — auto-select contacts with valid emails, skip sent
        const company = companies.find(c => c.id === id);
        if (company?.contacts) {
          setSelectedContactIds(prevContacts => {
            const next = new Set(prevContacts);
            company.contacts!.forEach(c => {
              if (isSelectable(c)) next.add(c.id);
            });
            return next;
          });
        }
        return [...prev, id];
      }
    });
  };

  const toggleContact = (contactId: string, companyId: string) => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
        // Also ensure the company is selected
        if (!selectedCompanyIds.includes(companyId)) {
          setSelectedCompanyIds(p => [...p, companyId]);
        }
      }
      return next;
    });
  };

  const toggleAllContactsInCompany = (company: Company) => {
    const contacts = company.contacts || [];
    const selectableContacts = contacts.filter(c => isSelectable(c));
    const allSelected = selectableContacts.length > 0 && selectableContacts.every(c => selectedContactIds.has(c.id));
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        contacts.forEach(c => next.delete(c.id)); // deselect ALL (including manually selected sent ones)
      } else {
        selectableContacts.forEach(c => next.add(c.id)); // only select non-sent
      }
      return next;
    });
  };

  const totalSelectedContacts = selectedContactIds.size > 0
    ? selectedContactIds.size
    : companies
        .filter(c => selectedCompanyIds.includes(c.id))
        .reduce((sum, c) => sum + (c._count?.contacts || 0), 0);

  const toneLabels: { value: 'professional' | 'friendly' | 'persuasive'; label: string }[] = [
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'persuasive', label: 'Urgent' },
  ];

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: '#1a1a2e',
    border: '2px solid #6366F1',
    borderRadius: '16px',
    width: '860px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 0 0 1px rgba(99,102,241,0.5), 0 25px 60px rgba(0,0,0,0.7)',
    color: '#F1F5F9',
    position: 'relative',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#252540',
    border: '1px solid #3d3d5c',
    borderRadius: '8px',
    color: '#F1F5F9',
    padding: '10px 14px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const cardStyle: React.CSSProperties = {
    background: '#20203a',
    border: '1px solid #3d3d5c',
    borderRadius: '10px',
    padding: '16px',
  };

  // Progress bar
  const stepCount = 4;
  const ProgressBar = () => (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
      {[1, 2, 3, 4].map(s => (
        <div
          key={s}
          style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            background: s <= step ? (s === 4 && sendResult ? '#10B981' : '#6366F1') : 'rgba(255,255,255,0.12)',
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#F1F5F9' }}>
              {step === 1 && 'New Campaign'}
              {step === 2 && 'Who Gets It?'}
              {step === 3 && 'Review & Send'}
              {step === 4 && (sendProgress?.status === 'complete' ? 'Campaign Complete!' : 'Sending Campaign...')}
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0' }}>
              {step === 1 && 'Describe your campaign — AI writes the email, or pick a staffing template'}
              {step === 2 && 'Select companies and pick the contacts to email'}
              {step === 3 && 'Preview the email, confirm details, and send'}
              {step === 4 && (sendProgress?.status === 'complete' ? 'All emails delivered' : 'Emails are being sent in the background')}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '4px',
            }}
          >
            <XMarkIcon style={{ width: '22px', height: '22px' }} />
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          <ProgressBar />

          {/* ======================== STEP 1 ======================== */}
          {step === 1 && (
            <div>
              {/* Source toggle: AI Generate vs Staffing Templates vs Use Template */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#252540', borderRadius: '10px', padding: '4px' }}>
                <button
                  onClick={() => setContentSource('staffing')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: contentSource === 'staffing' ? '#6366F1' : 'transparent',
                    color: contentSource === 'staffing' ? '#fff' : '#94A3B8',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  🏢 Staffing Templates
                </button>
                <button
                  onClick={() => setContentSource('ai')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: contentSource === 'ai' ? '#6366F1' : 'transparent',
                    color: contentSource === 'ai' ? '#fff' : '#94A3B8',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  ✨ AI Generate
                </button>
                <button
                  onClick={() => setContentSource('template')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: contentSource === 'template' ? '#6366F1' : 'transparent',
                    color: contentSource === 'template' ? '#fff' : '#94A3B8',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  📄 My Templates
                </button>
              </div>

              {/* Helper: replace template variables with sample data for preview */}
              {(() => {
                const fillTemplate = (text: string) => {
                  return text
                    .replace(/\{\{firstName\}\}/g, 'Sarah')
                    .replace(/\{\{lastName\}\}/g, 'Mitchell')
                    .replace(/\{\{companyName\}\}/g, 'Deloitte')
                    .replace(/\{\{email\}\}/g, 'sarah.mitchell@deloitte.com')
                    .replace(/\{\{fromName\}\}/g, 'Zietra');
                };

                const selectTemplate = (name: string, subj: string, html: string, idx?: number, templateId?: string) => {
                  setSubject(subj);
                  setEmailBody(html);
                  setCampaignName(name);
                  if (idx !== undefined) setSelectedStaffingIdx(idx);
                  if (templateId) setSelectedTemplateId(templateId);
                };

                return null; // This IIFE just defines helpers used below via closure
              })()}

              {/* Staffing Templates (shown when "Staffing Templates" is selected) */}
              {contentSource === 'staffing' && (
                <div>
                  {staffingTemplates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                      <p style={{ fontSize: '40px', marginBottom: '12px' }}>🏢</p>
                      <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: '#F1F5F9' }}>Loading staffing templates...</p>
                      <p style={{ fontSize: '13px' }}>Professional templates for technology staffing outreach</p>
                    </div>
                  ) : selectedStaffingIdx === null ? (
                    /* Template selection cards — 8 campaign templates */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                      {staffingTemplates.map((t: any, idx: number) => {
                        const descriptions: Record<string, string> = {
                          'your ERP + your system': 'your ERP 2026.1 + your system — AI Canvas, SuiteScript 2.1, Solution Architects',
                          'AI Consulting': 'AI agents, GenAI/LLM, RAG systems, ML pipelines — target companies stuck in pilot mode',
                          'Cloud & Platform Engineering': 'Kubernetes, Platform Engineering, DevOps, SRE — 90% of orgs face cloud skills gaps',
                          'Cybersecurity': '$4.88M per breach — pen testers, SOC analysts, Zero Trust, compliance (SOC2/HIPAA)',
                          'Data Engineering': 'Spark, Snowflake, real-time pipelines, dbt, analytics — every AI project starts with data',
                          'Full-Stack Engineering': 'React + Next.js + AI-augmented dev — engineers who ship product, not just code',
                          'Mobile Engineering': 'iOS SwiftUI, Android Jetpack Compose, React Native, Flutter — on-device AI ready',
                        };
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedStaffingIdx(idx);
                              setSubject(t.subjects?.[0] || t.subject);
                              setEmailBody(t.htmlContent);
                              setCampaignName(t.name + ' Campaign');
                            }}
                            style={{
                              padding: '16px',
                              borderRadius: '10px',
                              border: '1px solid #3d3d5c',
                              background: '#20203a',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              display: 'flex',
                              gap: '14px',
                              alignItems: 'flex-start',
                            }}
                          >
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '10px',
                              background: `linear-gradient(135deg, ${t.color || '#667eea'}, ${t.color || '#667eea'}CC)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '16px', color: '#fff', fontWeight: 700, flexShrink: 0,
                            }}>
                              {idx + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '14px', color: '#F1F5F9', marginBottom: '4px' }}>
                                {t.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.4 }}>
                                {descriptions[t.name] || t.subject?.replace(/\{\{companyName\}\}/g, '[Company]').slice(0, 100)}
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: t.color || '#6366F1', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {(t as any).subjects?.length || 0} subjects
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Selected template — show rendered preview, not raw HTML */
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <button
                          onClick={() => setSelectedStaffingIdx(null)}
                          style={{ background: 'none', border: 'none', color: '#A5B4FC', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                        >
                          ← Back to templates
                        </button>
                        <span style={{ fontSize: '12px', color: '#6366F1', fontWeight: 600 }}>
                          {staffingTemplates[selectedStaffingIdx]?.name}
                        </span>
                      </div>

                      {/* Subject line picker — uses selected template's own subjects */}
                      <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Choose a subject line (A/B test different ones)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                        {(staffingTemplates[selectedStaffingIdx]?.subjects || [staffingTemplates[selectedStaffingIdx]?.subject]).filter(Boolean).map((s, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSubject(s)}
                            style={{
                              padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                              border: subject === s ? '2px solid #6366F1' : '1px solid #3d3d5c',
                              background: subject === s ? 'rgba(99,102,241,0.1)' : '#1e1e36',
                              display: 'flex', alignItems: 'center', gap: '10px',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{
                              width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                              border: subject === s ? '2px solid #6366F1' : '2px solid #3d3d5c',
                              background: subject === s ? '#6366F1' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {subject === s && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                            </div>
                            <span style={{ fontSize: '13px', color: subject === s ? '#A5B4FC' : '#94A3B8', fontWeight: subject === s ? 600 : 400 }}>
                              {s.replace(/\{\{companyName\}\}/g, '[Company]')}
                            </span>
                          </div>
                        ))}
                        <div style={{ marginTop: '4px' }}>
                          <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="Or type a custom subject line..."
                            style={{ ...inputStyle, fontSize: '13px' }}
                          />
                        </div>
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 12px', fontStyle: 'italic' }}>
                        Tip: Send different subject lines to different company batches, then compare open rates in Analytics.
                      </p>

                      {/* Rendered email preview — what the recipient actually sees */}
                      <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email preview (names auto-filled per contact)</label>
                      <div style={{
                        border: '1px solid #3d3d5c',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        maxHeight: '450px',
                        overflowY: 'auto',
                      }}>
                        <div style={{ background: '#ffffff', color: '#333333', padding: '16px', fontSize: '14px', lineHeight: '1.6' }}>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(
                                emailBody
                                  .replace(/\{\{firstName\}\}/g, 'Sarah')
                                  .replace(/\{\{lastName\}\}/g, 'Mitchell')
                                  .replace(/\{\{companyName\}\}/g, 'Deloitte')
                                  .replace(/\{\{email\}\}/g, 'sarah.mitchell@deloitte.com')
                                  .replace(/\{\{fromName\}\}/g, 'Zietra')
                              )
                            }}
                            style={{ color: '#333333' }}
                          />
                        </div>
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0', fontStyle: 'italic' }}>
                        Names shown above are samples — each recipient gets their own name and company auto-filled.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Template picker (shown when "My Templates" is selected) */}
              {contentSource === 'template' && (
                <div>
                  {templates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                      <p style={{ fontSize: '40px', marginBottom: '12px' }}>📄</p>
                      <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: '#F1F5F9' }}>No templates yet</p>
                      <p style={{ fontSize: '13px', marginBottom: '16px' }}>Create templates in Email Templates to use them here</p>
                      <a href="/email-templates" style={{ color: '#6366F1', textDecoration: 'underline', fontSize: '13px' }}>
                        Go to Email Templates →
                      </a>
                    </div>
                  ) : !selectedTemplateId ? (
                    /* Template cards — clean selection */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                      {templates.map(t => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTemplateId(t.id);
                            setSubject(t.subject);
                            setEmailBody(t.htmlContent);
                            setCampaignName(t.name);
                          }}
                          style={{
                            padding: '14px',
                            borderRadius: '10px',
                            border: '1px solid #3d3d5c',
                            background: '#20203a',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#F1F5F9', marginBottom: '6px' }}>
                            {t.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                            {t.subject.replace(/\{\{.*?\}\}/g, '...').slice(0, 60)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Selected user template — rendered preview */
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <button
                          onClick={() => setSelectedTemplateId(null)}
                          style={{ background: 'none', border: 'none', color: '#A5B4FC', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                        >
                          ← Back to templates
                        </button>
                      </div>

                      <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject line</label>
                      <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, marginBottom: '12px' }} />

                      <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email preview</label>
                      <div style={{
                        border: '1px solid #3d3d5c', borderRadius: '10px', overflow: 'hidden', maxHeight: '450px', overflowY: 'auto',
                      }}>
                        <div style={{ background: '#ffffff', color: '#333333', padding: '16px', fontSize: '14px', lineHeight: '1.6' }}>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(
                                emailBody
                                  .replace(/\{\{firstName\}\}/g, 'Sarah')
                                  .replace(/\{\{lastName\}\}/g, 'Mitchell')
                                  .replace(/\{\{companyName\}\}/g, 'Deloitte')
                                  .replace(/\{\{email\}\}/g, 'sarah.mitchell@deloitte.com')
                              )
                            }}
                            style={{ color: '#333333' }}
                          />
                        </div>
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0', fontStyle: 'italic' }}>
                        Names auto-filled per contact when sent.
                      </p>
                    </div>
                  )}

                  {/* Raw editing removed — preview is shown above */}
                </div>
              )}

              {/* AI Generation (existing — shown when "AI Generate" is selected) */}
              {contentSource === 'ai' && (
              <div style={{ display: 'flex', gap: '20px' }}>
                {/* Left panel */}
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#6366F1',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    Tell the AI what you want to say
                  </p>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g. We are offering 20% off our cyber security training for your ERP customers this month only"
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      minHeight: '100px',
                      lineHeight: '1.5',
                    }}
                  />

                  {/* Tone pills */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {toneLabels.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          border: tone === t.value ? '1px solid #6366F1' : '1px solid rgba(99,102,241,0.4)',
                          background: tone === t.value ? '#6366F1' : 'transparent',
                          color: tone === t.value ? '#fff' : '#A5B4FC',
                          transition: 'all 0.2s',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={runGeneration}
                    disabled={generating || !prompt.trim()}
                    style={{
                      marginTop: '16px',
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: generating || !prompt.trim()
                        ? 'rgba(99,102,241,0.4)'
                        : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {generating ? (
                      <>
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            border: '2px solid rgba(255,255,255,0.4)',
                            borderTopColor: '#fff',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                        Generating...
                      </>
                    ) : (
                      '✨ Write my email'
                    )}
                  </button>

                  {generateError && (
                    <p style={{ color: '#F87171', fontSize: '12px', marginTop: '8px' }}>
                      {generateError}
                    </p>
                  )}
                </div>

                {/* Right panel — rendered preview after generation */}
                {subject && emailBody && (
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                        AI Draft — Ready to Send
                      </p>
                      <button
                        onClick={runGeneration}
                        disabled={generating}
                        style={{ background: 'none', border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer', color: '#A5B4FC', fontSize: '11px', padding: '4px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        🔄 Regenerate
                      </button>
                    </div>

                    {/* Subject line — editable */}
                    <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject line</label>
                    <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, marginBottom: '10px' }} />

                    {/* Rendered email preview */}
                    <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email preview</label>
                    <div style={{ border: '1px solid #3d3d5c', borderRadius: '10px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto' }}>
                      <div style={{ background: '#ffffff', color: '#333333', padding: '12px', fontSize: '14px', lineHeight: '1.6' }}>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(
                              emailBody
                                .replace(/\{\{firstName\}\}/g, 'Sarah')
                                .replace(/\{\{lastName\}\}/g, 'Mitchell')
                                .replace(/\{\{companyName\}\}/g, 'Deloitte')
                                .replace(/\{\{email\}\}/g, 'sarah.mitchell@deloitte.com')
                                .replace(/\{\{fromName\}\}/g, 'Zietra')
                            )
                          }}
                          style={{ color: '#333333' }}
                        />
                      </div>
                    </div>
                    <p style={{ fontSize: '10px', color: '#64748B', margin: '4px 0 0', fontStyle: 'italic' }}>
                      Names auto-filled per recipient when sent.
                    </p>
                  </div>
                )}
              </div>
              )}

              {/* Universal email preview — shows for ANY tab once email content exists */}
              {emailBody && (
                <div style={{ marginTop: '16px', borderTop: '1px solid #3d3d5c', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      style={{
                        background: showPreview ? 'rgba(99,102,241,0.15)' : 'transparent',
                        border: '1px solid rgba(99,102,241,0.3)',
                        color: '#A5B4FC',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {showPreview ? '🔽 Hide Preview' : '👁️ Preview Email'}
                    </button>
                    {subject && (
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        Subject: <span style={{ color: '#F1F5F9' }}>{subject.replace(/\{\{companyName\}\}/g, 'Deloitte').slice(0, 50)}{subject.length > 50 ? '...' : ''}</span>
                      </span>
                    )}
                  </div>

                  {showPreview && (
                    <div style={{ border: '1px solid #3d3d5c', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ background: '#1e1e36', padding: '8px 14px', borderBottom: '1px solid #3d3d5c' }}>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                          <strong style={{ color: '#CBD5E1' }}>Subject:</strong> {subject.replace(/\{\{companyName\}\}/g, 'Deloitte').replace(/\{\{firstName\}\}/g, 'Sarah')}
                        </div>
                      </div>
                      <div style={{ background: '#ffffff', color: '#333333', maxHeight: '400px', overflowY: 'auto', padding: '16px', fontSize: '14px', lineHeight: '1.6' }}>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(
                              emailBody
                                .replace(/\{\{firstName\}\}/g, 'Sarah')
                                .replace(/\{\{lastName\}\}/g, 'Mitchell')
                                .replace(/\{\{companyName\}\}/g, 'Deloitte')
                                .replace(/\{\{email\}\}/g, 'sarah.mitchell@deloitte.com')
                                .replace(/\{\{fromName\}\}/g, 'Zietra')
                            )
                          }}
                          style={{ color: '#333333' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1 footer */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setStep(2)}
                  disabled={!subject || !emailBody}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: !subject || !emailBody
                      ? 'rgba(99,102,241,0.3)'
                      : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: !subject || !emailBody ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next: Pick your group →
                </button>
              </div>
            </div>
          )}

          {/* ======================== STEP 2 ======================== */}
          {step === 2 && (() => {
            const filtered = companies.filter(c => {
              const matchesSearch = c.name.toLowerCase().includes(companySearch.toLowerCase());
              const matchesVertical = verticalFilter === 'all' || c.vertical === verticalFilter;
              return matchesSearch && matchesVertical;
            });
            const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedCompanyIds.includes(c.id));

            return (
            <div>
              {/* Search bar */}
              <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    value={companySearch}
                    onChange={e => setCompanySearch(e.target.value)}
                    placeholder="Search companies... (e.g. your ERP, Cyber, Tech)"
                    style={{
                      ...inputStyle,
                      paddingLeft: '36px',
                    }}
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.5 }}>🔍</span>
                </div>
                <button
                  onClick={() => {
                    if (allFilteredSelected) {
                      setSelectedCompanyIds(prev => prev.filter(id => !filtered.find(c => c.id === id)));
                      // Also remove contacts from deselected companies
                      setSelectedContactIds(prev => {
                        const next = new Set(prev);
                        filtered.forEach(company => {
                          (company.contacts || []).forEach(c => next.delete(c.id));
                        });
                        return next;
                      });
                    } else {
                      const newIds = [...new Set([...selectedCompanyIds, ...filtered.map(c => c.id)])];
                      setSelectedCompanyIds(newIds);
                      // Auto-select contacts with valid emails, skip sent
                      setSelectedContactIds(prev => {
                        const next = new Set(prev);
                        filtered.forEach(company => {
                          (company.contacts || []).forEach(c => {
                            if (isSelectable(c)) next.add(c.id);
                          });
                        });
                        return next;
                      });
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(99,102,241,0.4)',
                    background: allFilteredSelected ? '#6366F1' : 'transparent',
                    color: allFilteredSelected ? '#fff' : '#A5B4FC',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {allFilteredSelected ? '✓ All Selected' : `Select All (${filtered.length})`}
                </button>
              </div>

              {/* Vertical filter tabs */}
              {verticals.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setVerticalFilter('all')}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                      border: verticalFilter === 'all' ? '1px solid #6366F1' : '1px solid #3d3d5c',
                      background: verticalFilter === 'all' ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: verticalFilter === 'all' ? '#A5B4FC' : '#64748B',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    All ({companies.length})
                  </button>
                  {verticals.filter(v => v.name !== 'Uncategorized').map(v => (
                    <button
                      key={v.name}
                      onClick={() => setVerticalFilter(v.name)}
                      style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        border: verticalFilter === v.name ? '1px solid #6366F1' : '1px solid #3d3d5c',
                        background: verticalFilter === v.name ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: verticalFilter === v.name ? '#A5B4FC' : '#64748B',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {v.name} ({v.count})
                    </button>
                  ))}
                  {verticals.some(v => v.name === 'Uncategorized') && (
                    <button
                      onClick={() => setVerticalFilter('Uncategorized')}
                      style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        border: verticalFilter === 'Uncategorized' ? '1px solid #6366F1' : '1px solid #3d3d5c',
                        background: verticalFilter === 'Uncategorized' ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: verticalFilter === 'Uncategorized' ? '#F59E0B' : '#64748B',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      Uncategorized ({verticals.find(v => v.name === 'Uncategorized')?.count || 0})
                    </button>
                  )}
                </div>
              )}

              {/* Stats bar + seed button */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#94A3B8',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span>{companies.length} total groups</span>
                  <span>•</span>
                  <span>{filtered.length} shown</span>
                  <span>•</span>
                  <span style={{ color: '#A5B4FC', fontWeight: 600 }}>{selectedCompanyIds.length} selected</span>
                </div>
                {!seedDone && (
                  <button
                    onClick={seedStaffingCompanies}
                    disabled={seeding}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(99,102,241,0.4)',
                      background: 'transparent',
                      color: '#A5B4FC',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: seeding ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {seeding ? '...' : '+ Add Staffing Companies'}
                  </button>
                )}
              </div>

              {companies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>No companies yet</p>
                  <p style={{ fontSize: '13px', marginBottom: '16px' }}>Seed enterprise staffing companies or add contacts first</p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={seedStaffingCompanies}
                      disabled={seeding || seedDone}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: seedDone ? '#10B981' : seeding ? 'rgba(99,102,241,0.4)' : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: seeding || seedDone ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {seedDone ? '✓ Companies Loaded' : seeding ? 'Loading Companies...' : '🏢 Load Staffing Companies'}
                    </button>
                    <a href="/contacts" style={{ color: '#6366F1', textDecoration: 'underline', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                      Go to Contacts →
                    </a>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                  <p style={{ fontSize: '14px' }}>No companies match "{companySearch}"</p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: '16px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {filtered.map((company) => {
                    const isSelected = selectedCompanyIds.includes(company.id);
                    const isExpanded = expandedCompanyId === company.id;
                    const contactCount = company._count?.contacts || 0;
                    const contacts = company.contacts || [];
                    const selectedInCompany = contacts.filter(c => selectedContactIds.has(c.id)).length;

                    return (
                      <div key={company.id} style={{ borderRadius: '10px', border: isSelected ? '2px solid #6366F1' : '1px solid #3d3d5c', background: isSelected ? 'rgba(99,102,241,0.1)' : '#20203a', transition: 'all 0.15s' }}>
                        {/* Company header row */}
                        <div
                          onClick={() => toggleCompany(company.id)}
                          style={{ minHeight: '56px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', boxSizing: 'border-box' }}
                        >
                          {/* Checkbox */}
                          <div style={{
                            width: '20px', height: '20px', minWidth: '20px', borderRadius: '5px',
                            border: isSelected ? 'none' : '2px solid #4a4a6a',
                            background: isSelected ? '#6366F1' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '11px', fontWeight: 800, lineHeight: '1',
                          }}>
                            {isSelected ? '✓' : ''}
                          </div>

                          {/* Company name + vertical + contact count */}
                          <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: '#F1F5F9' }}>
                                {company.name || '(unnamed)'}
                              </span>
                              {company.vertical && company.vertical !== 'Uncategorized' && (
                                <span style={{
                                  padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600,
                                  background: 'rgba(99,102,241,0.12)', color: '#818CF8', whiteSpace: 'nowrap',
                                }}>{company.vertical}</span>
                              )}
                            </div>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              {contacts.filter(c => isValidEmail(c.email)).length}/{contactCount} with email
                              {selectedInCompany > 0 && <span style={{ color: '#A5B4FC' }}> ({selectedInCompany} selected)</span>}
                              {(() => {
                                const sentInCompany = (company.contacts || []).filter(c => sentContactIds.has(c.id)).length;
                                return sentInCompany > 0 ? (
                                  <span style={{ color: '#C4B5FD', marginLeft: '6px', fontSize: '11px' }}>
                                    ({sentInCompany} already sent)
                                  </span>
                                ) : null;
                              })()}
                            </span>
                          </div>

                          {/* Expand button */}
                          {contactCount > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedCompanyId(isExpanded ? null : company.id); }}
                              style={{
                                background: isExpanded ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                                border: 'none', cursor: 'pointer',
                                color: isExpanded ? '#A5B4FC' : '#94A3B8',
                                fontSize: '11px', padding: '5px 10px', minWidth: '50px',
                                borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap',
                              }}
                            >
                              {isExpanded ? '▲ Hide' : '▼ View'}
                            </button>
                          )}
                        </div>

                        {/* Expanded contact list */}
                        {isExpanded && contacts.length > 0 && (
                          <div style={{ borderTop: '1px solid #2d2d4a', padding: '8px 14px 12px', background: 'rgba(0,0,0,0.15)' }}>
                            {/* Select all / none for this company */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Contacts in {company.name}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleAllContactsInCompany(company); }}
                                style={{
                                  background: 'none', border: '1px solid rgba(99,102,241,0.3)',
                                  color: '#A5B4FC', fontSize: '11px', padding: '3px 8px',
                                  borderRadius: '4px', cursor: 'pointer',
                                }}
                              >
                                {contacts.every(c => selectedContactIds.has(c.id)) ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                            {contacts.map(contact => {
                              const isContactSelected = selectedContactIds.has(contact.id);
                              const hasValidEmail = isValidEmail(contact.email);
                              const isSent = sentContactIds.has(contact.id);
                              return (
                                <div
                                  key={contact.id}
                                  onClick={(e) => { e.stopPropagation(); if (hasValidEmail) toggleContact(contact.id, company.id); }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '8px 10px', borderRadius: '6px',
                                    cursor: hasValidEmail ? 'pointer' : 'not-allowed',
                                    opacity: hasValidEmail ? 1 : 0.45,
                                    background: isContactSelected ? 'rgba(99,102,241,0.12)' : 'transparent',
                                    border: isContactSelected ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                                    marginBottom: '4px', transition: 'all 0.1s',
                                  }}
                                >
                                  {/* Checkbox */}
                                  <div style={{
                                    width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                                    border: isContactSelected ? '2px solid #6366F1' : '2px solid #3d3d5c',
                                    background: isContactSelected ? '#6366F1' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '10px', color: '#fff', fontWeight: 700,
                                  }}>
                                    {isContactSelected && '✓'}
                                  </div>
                                  {/* Contact info */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9' }}>
                                      {contact.firstName} {contact.lastName}
                                      {isSent && (
                                        <span style={{
                                          display: 'inline-block', marginLeft: '8px', padding: '1px 7px', borderRadius: '4px',
                                          background: 'rgba(139,92,246,0.25)', color: '#C4B5FD',
                                          fontSize: '10px', fontWeight: 700, verticalAlign: 'middle',
                                        }}>Sent</span>
                                      )}
                                      {!hasValidEmail && (
                                        <span style={{
                                          display: 'inline-block', marginLeft: '8px', padding: '1px 7px', borderRadius: '4px',
                                          background: 'rgba(239,68,68,0.2)', color: '#F87171',
                                          fontSize: '10px', fontWeight: 700, verticalAlign: 'middle',
                                        }}>No email</span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      <span>{contact.email}</span>
                                      {contact.role && <span style={{ color: '#6366F1' }}>• {contact.role}</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary bar */}
              {selectedCompanyIds.length > 0 && (
                <div
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: '#A5B4FC',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    {selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'company' : 'companies'} selected
                    — {totalSelectedContacts} {totalSelectedContacts === 1 ? 'person' : 'people'} will receive this email
                  </span>
                  <button
                    onClick={() => setSelectedCompanyIds([])}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#F87171',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Step 2 footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#94A3B8',
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedCompanyIds.length === 0}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background:
                      selectedCompanyIds.length === 0
                        ? 'rgba(99,102,241,0.3)'
                        : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: selectedCompanyIds.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next: Review & Send →
                </button>
              </div>
            </div>
            );
          })()}

          {/* ======================== STEP 3 ======================== */}
          {step === 3 && (() => {
            // Build the actual recipient list from selected companies + contacts
            const allRecipients: { firstName: string; lastName: string; email: string; companyName: string }[] = [];
            companies.filter(c => selectedCompanyIds.includes(c.id)).forEach(company => {
              (company.contacts || []).forEach(contact => {
                if (selectedContactIds.size === 0 || selectedContactIds.has(contact.id)) {
                  allRecipients.push({
                    firstName: contact.firstName || '',
                    lastName: contact.lastName || '',
                    email: contact.email || '',
                    companyName: company.name || '',
                  });
                }
              });
            });

            // Use first recipient for preview, fallback to sample
            const previewRecipient = allRecipients[0] || { firstName: 'Sarah', lastName: 'Mitchell', email: 'sarah@example.com', companyName: 'Deloitte' };

            // Replace template variables with real recipient data
            const fillVars = (text: string) => text
              .replace(/\{\{firstName\}\}/g, previewRecipient.firstName)
              .replace(/\{\{lastName\}\}/g, previewRecipient.lastName)
              .replace(/\{\{companyName\}\}/g, previewRecipient.companyName)
              .replace(/\{\{email\}\}/g, previewRecipient.email)
              .replace(/\{\{fromName\}\}/g, 'Zietra');

            return (
            <div>
              {/* Recipient list — who exactly gets this email */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: 600 }}>
                  Sending to {allRecipients.length} {allRecipients.length === 1 ? 'person' : 'people'}
                </p>
                <div style={{ maxHeight: '120px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #3d3d5c', background: '#1e1e36' }}>
                  {allRecipients.map((r, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: idx < allRecipients.length - 1 ? '1px solid #2d2d4a' : 'none',
                      fontSize: '12px',
                    }}>
                      <div>
                        <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{r.firstName} {r.lastName}</span>
                        <span style={{ color: '#64748B', marginLeft: '6px' }}>{r.email}</span>
                      </div>
                      <span style={{ color: '#6366F1', fontSize: '11px', fontWeight: 500 }}>{r.companyName}</span>
                    </div>
                  ))}
                  {allRecipients.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      No contacts selected — go back and select contacts
                    </div>
                  )}
                </div>
              </div>

              {/* 2-column summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={cardStyle}>
                  <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Campaign name</p>
                  <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)} style={{ ...inputStyle }} />
                </div>
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>From address</p>
                    <button onClick={() => setEditingFrom(f => !f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1', fontSize: '12px' }}>
                      ✏️ edit
                    </button>
                  </div>
                  {editingFrom ? (
                    <input type="email" value={fromAddress} onChange={e => setFromAddress(e.target.value)} style={{ ...inputStyle }} />
                  ) : (
                    <p style={{ fontSize: '14px', color: '#F1F5F9', margin: 0 }}>{fromAddress}</p>
                  )}
                </div>
              </div>

              {/* Email preview — auto-populated with REAL recipient data */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: 600 }}>
                  Email preview — showing how <span style={{ color: '#A5B4FC' }}>{previewRecipient.firstName} {previewRecipient.lastName}</span> at <span style={{ color: '#A5B4FC' }}>{previewRecipient.companyName}</span> will see it
                </p>

                <div style={{ border: '1px solid #3d3d5c', borderRadius: '10px', overflow: 'hidden' }}>
                  {/* Email header */}
                  <div style={{ background: '#1e1e36', padding: '10px 14px', borderBottom: '1px solid #3d3d5c' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '3px' }}>
                      <strong style={{ color: '#CBD5E1' }}>From:</strong> {fromAddress || 'campaigns@zietra.com'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '3px' }}>
                      <strong style={{ color: '#CBD5E1' }}>To:</strong> {previewRecipient.firstName} {previewRecipient.lastName} &lt;{previewRecipient.email}&gt;
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      <strong style={{ color: '#CBD5E1' }}>Subject:</strong> {fillVars(subject)}
                    </div>
                  </div>
                  {/* Email body — with real names filled in */}
                  <div style={{ background: '#ffffff', color: '#333333', maxHeight: '450px', overflowY: 'auto', padding: '16px', fontSize: '14px', lineHeight: '1.6' }}>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fillVars(emailBody)) }} style={{ color: '#333333' }} />
                  </div>
                </div>

                {allRecipients.length > 1 && (
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0', fontStyle: 'italic' }}>
                    Each of the {allRecipients.length} recipients gets their own personalized version with their name and company.
                  </p>
                )}
              </div>

              {/* Send speed selector */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: 600 }}>
                  Send speed
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 1, label: '1 min', desc: 'Fast' },
                    { value: 5, label: '5 min', desc: 'Normal' },
                    { value: 10, label: '10 min', desc: 'Slow' },
                    { value: 0, label: 'Instant', desc: 'All at once' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSendSpeed(opt.value)}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: sendSpeed === opt.value ? '2px solid #6366F1' : '1px solid #3d3d5c',
                        background: sendSpeed === opt.value ? 'rgba(99,102,241,0.15)' : '#20203a',
                        color: sendSpeed === opt.value ? '#A5B4FC' : '#94A3B8',
                        cursor: 'pointer',
                        textAlign: 'center' as const,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.7 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0' }}>
                  {sendSpeed === 0
                    ? `All ${totalSelectedContacts} emails sent immediately`
                    : `1 email every ${sendSpeed} min — ~${(totalSelectedContacts - 1) * sendSpeed} min total for ${totalSelectedContacts} contacts`}
                </p>
              </div>

              {/* Send button — shows confirmation first */}
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={sending || totalSelectedContacts === 0}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                    background: totalSelectedContacts === 0 ? 'rgba(100,100,120,0.3)' : 'linear-gradient(to right, #10B981, #059669)',
                    color: '#fff', fontWeight: 700, fontSize: '15px',
                    cursor: totalSelectedContacts === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {sendSpeed === 0
                    ? `🚀 Send All ${totalSelectedContacts} Emails Now`
                    : `🚀 Start Sending — 1 every ${sendSpeed} min`}
                </button>
              ) : (
                <div style={{
                  border: '2px solid #F59E0B', borderRadius: '12px', padding: '20px',
                  background: 'rgba(245,158,11,0.06)', marginBottom: '0',
                }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#F59E0B', margin: '0 0 12px', textAlign: 'center' }}>
                    Confirm Campaign Send
                  </p>
                  <div style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.7, marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#94A3B8' }}>Recipients</span>
                      <span style={{ fontWeight: 700 }}>{totalSelectedContacts} contacts</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#94A3B8' }}>Speed</span>
                      <span style={{ fontWeight: 700 }}>{sendSpeed === 0 ? 'Instant (all at once)' : `1 every ${sendSpeed} min`}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#94A3B8' }}>Estimated time</span>
                      <span style={{ fontWeight: 700 }}>{sendSpeed === 0 ? 'Immediate' : `~${(totalSelectedContacts - 1) * sendSpeed} min`}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ color: '#94A3B8' }}>Subject</span>
                      <span style={{ fontWeight: 700, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject.replace(/\{\{companyName\}\}/g, '[Co]').slice(0, 50)}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#F59E0B', margin: '0 0 16px', textAlign: 'center', fontWeight: 600 }}>
                    Real emails will be sent from peter@zietra.com. This cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setShowConfirm(false)}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                        color: '#94A3B8', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { setShowConfirm(false); handleSend(); }}
                      disabled={sending}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                        background: sending ? 'rgba(16,185,129,0.4)' : 'linear-gradient(to right, #10B981, #059669)',
                        color: '#fff', fontWeight: 700, fontSize: '14px',
                        cursor: sending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {sending ? 'Sending...' : `Confirm — Send ${totalSelectedContacts} Emails`}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  marginTop: '12px', padding: '14px 16px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                }}>
                  <p style={{ color: '#F87171', fontSize: '13px', margin: 0, flex: 1 }}>
                    {error}
                  </p>
                  <button
                    onClick={() => { setShowConfirm(false); handleSend(); }}
                    disabled={sending}
                    style={{
                      background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                      color: '#F87171', padding: '6px 14px', borderRadius: '6px',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Step 3 footer */}
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#94A3B8',
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
              </div>
            </div>
            );
          })()}

          {/* ======================== STEP 4: LIVE PROGRESS ======================== */}
          {step === 4 && sendResult && (() => {
            const p = sendProgress;
            const isComplete = p?.status === 'complete';
            const progressPct = p && p.total > 0 ? Math.round((p.sent / p.total) * 100) : 0;
            const nextMin = p ? Math.floor(p.nextSendInSeconds / 60) : 0;
            const nextSec = p ? p.nextSendInSeconds % 60 : 0;

            return (
            <div style={{ textAlign: 'center' }}>
              {/* Status icon */}
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: isComplete
                  ? 'linear-gradient(135deg, #10B981, #059669)'
                  : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: isComplete ? '0 0 30px rgba(16,185,129,0.3)' : '0 0 30px rgba(99,102,241,0.3)',
              }}>
                <span style={{ fontSize: '36px' }}>{isComplete ? '✓' : '📨'}</span>
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 8px' }}>
                {isComplete ? 'Campaign Complete!' : 'Sending Campaign...'}
              </h3>
              <p style={{ fontSize: '14px', color: '#94A3B8', margin: '0 0 24px' }}>
                {isComplete
                  ? `All ${p?.sent || 0} emails delivered successfully`
                  : `Sending 1 email every ${sendSpeed} min — ${p?.remaining || 0} remaining`}
              </p>

              {/* Progress bar */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  height: '8px', borderRadius: '4px', background: '#252540', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: '4px',
                    background: isComplete
                      ? 'linear-gradient(to right, #10B981, #059669)'
                      : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                    width: `${progressPct}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>{progressPct}%</span>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>{p?.sent || 0} / {p?.total || 0}</span>
                </div>
              </div>

              {/* Stats cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                <div style={{ background: '#20203a', border: '1px solid #3d3d5c', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10B981' }}>{p?.sent || 0}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Sent</div>
                </div>
                <div style={{ background: '#20203a', border: '1px solid #3d3d5c', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#6366F1' }}>{p?.remaining || 0}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Remaining</div>
                </div>
                <div style={{ background: '#20203a', border: '1px solid #3d3d5c', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#F59E0B' }}>{p?.failed || 0}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Failed</div>
                </div>
                <div style={{ background: '#20203a', border: '1px solid #3d3d5c', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#A5B4FC' }}>
                    {isComplete ? '—' : `${nextMin}:${nextSec.toString().padStart(2, '0')}`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Next send</div>
                </div>
              </div>

              {/* Live indicator */}
              {!isComplete && (
                <div style={{
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#A5B4FC',
                  marginBottom: '20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%', background: '#10B981',
                    display: 'inline-block', animation: 'pulse 2s infinite',
                  }} />
                  Sending in progress — this page updates every 10 seconds. You can close and check back later.
                </div>
              )}

              {/* Done button */}
              <button
                onClick={() => { onClose(); }}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                  background: isComplete
                    ? 'linear-gradient(to right, #10B981, #059669)'
                    : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                  color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                }}
              >
                {isComplete ? 'Done — View Campaigns' : 'Close — Sending Continues in Background'}
              </button>
            </div>
            );
          })()}
        </div>

        {/* CSS for spinner */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    </div>
  );
}

export default CampaignWizard;
