import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MegaphoneIcon,
  PlusIcon,
  EnvelopeIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  XMarkIcon,
  PencilIcon,
  QuestionMarkCircleIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import CampaignWizard from '../../components/CampaignWizard';
import { EditCampaignModal } from '../../components/EditCampaignModal';
import { CampaignsHelpGuide } from '../../components/CampaignsHelpGuide';
import { useTheme } from '../../contexts/ThemeContext';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'social';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  subject?: string;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  convertedCount: number;
  scheduledDate?: string;
  createdAt: string;
  createdBy: string;
}

interface Company {
  id: string;
  name: string;
}

export function CampaignsPage() {
  const navigate = useNavigate();
  const { gradients } = useTheme();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ id: string; sent: number; total: number } | null>(null);
  const [sendingyour ERP, setSendingyour ERP] = useState(false);
  const [erpResult, setErpResult] = useState<{ sent: number; total: number; failed: number; companyCount: number } | null>(null);
  const [wizardPreselect, setWizardPreselect] = useState<{ subject: string; campaignType: string } | null>(null);

  useEffect(() => {
    loadCampaigns();
    // Auto-open wizard if coming from follow-up
    const params = new URLSearchParams(window.location.search);
    if (params.get('followup') === 'true') {
      setShowCreateModal(true);
      // Clean URL
      window.history.replaceState({}, '', '/campaigns');
    }
  }, []);

  const loadCampaigns = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');

      if (!token) {
        // Not authenticated — redirect to login
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`${apiUrl}/api/campaigns`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // Token expired or invalid — clear and redirect to login
        localStorage.removeItem('crmToken');
        localStorage.removeItem('crmUser');
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      // Map API data to component format — guard against missing data
      const campaignList = Array.isArray(data?.campaigns) ? data.campaigns : Array.isArray(data) ? data : [];
      const mappedCampaigns = campaignList.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type || 'email',
        status: c.status ? c.status.toLowerCase() : 'draft',
        subject: c.subject,
        sentCount: c.totalSent || c._count?.emailLogs || 0,
        openedCount: c.totalOpened || 0,
        clickedCount: c.totalClicked || 0,
        convertedCount: 0,
        scheduledDate: c.scheduledDate,
        createdAt: c.createdAt,
        createdBy: 'Current User',
      }));

      setCampaigns(mappedCampaigns);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setCampaigns([]);
      setIsLoading(false);
    }
  };

  const handleSendNow = async (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation();
    if (!window.confirm('Send this campaign now to all contacts?')) return;
    setSendingCampaignId(campaignId);
    setSendResult(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSendResult({ id: campaignId, sent: data.sent, total: data.total });
        loadCampaigns();
      } else {
        alert(data.error || 'Failed to send campaign');
      }
    } catch {
      alert('Failed to send campaign');
    } finally {
      setSendingCampaignId(null);
    }
  };

  const handleyour ERPCampaign = async () => {
    if (!window.confirm('Send the $2/hr staff augmentation campaign to ALL your ERP companies now?\n\nThis will send real emails via AWS SES.')) return;
    setSendingyour ERP(true);
    setErpResult(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/quick-send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setErpResult({ sent: data.sent, total: data.total, failed: data.failed, companyCount: data.companyCount });
        loadCampaigns();
      } else {
        alert(data.error || 'Failed to send your ERP campaign');
      }
    } catch {
      alert('Failed to send your ERP campaign');
    } finally {
      setSendingyour ERP(false);
    }
  };

  const filteredCampaigns = filterStatus === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === filterStatus);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--border-default)]',
      scheduled: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      active: 'bg-green-500/15 text-green-400 border border-green-500/30',
      completed: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
      paused: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
      sent: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      sending: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
    };
    return `px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${badges[status] || 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--border-default)]'}`;
  };

  const calculateRate = (count: number, total: number) => {
    if (total === 0) return '0';
    return ((count / total) * 100).toFixed(1);
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return '—';
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="bg-[var(--glass-bg)] rounded-xl h-32"></div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[var(--glass-bg)] border border-[var(--border-default)] rounded-xl h-24"></div>
            ))}
          </div>

          {/* Campaign cards skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--glass-bg)] rounded-xl shadow-md h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalStats = campaigns.reduce(
    (acc, campaign) => ({
      sent: acc.sent + campaign.sentCount,
      opened: acc.opened + campaign.openedCount,
      clicked: acc.clicked + campaign.clickedCount,
      converted: acc.converted + campaign.convertedCount,
    }),
    { sent: 0, opened: 0, clicked: 0, converted: 0 }
  );

  // Count total campaigns (each campaign = 1 in the count)
  const totalCompanies = campaigns.length;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen overflow-y-auto">
      {/* Header with gradient background */}
      <div className={`mb-8 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl p-8 shadow-xl`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <MegaphoneIcon className="h-10 w-10 text-white" />
              <h1 className="text-4xl font-bold text-white tracking-tight">Marketing Campaigns</h1>
            </div>
            <p className="text-lg text-white/90 font-medium">Create and manage email marketing campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setWizardPreselect({ subject: "{{companyName}}'s your ERP team ready for 2026.1?", campaignType: 'erp' });
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide border border-orange-400/30"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              Send your ERP Campaign
            </button>
            <button
              type="button"
              onClick={() => setShowHelpGuide(true)}
              className={`flex items-center gap-2 px-4 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide border border-indigo-500/30`}
              title="Open Campaigns Help Guide"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
              Help
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide border border-indigo-500/30`}
            >
              <PlusIcon className="h-5 w-5" />
              Create Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} rounded-xl px-5 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-indigo-500/30`}>
          <div className="flex items-center gap-2 mb-2">
            <EnvelopeIcon className="w-5 h-5 text-white" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Total Sent</span>
          </div>
          <span className="text-3xl font-bold text-white">{totalStats.sent.toLocaleString()}</span>
        </div>

        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} rounded-xl px-5 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-indigo-500/30`}>
          <div className="flex items-center gap-2 mb-2">
            <EyeIcon className="w-5 h-5 text-white" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Opened</span>
          </div>
          <span className="text-3xl font-bold text-white">
            {totalStats.opened.toLocaleString()}
            <span className="text-base font-medium ml-2 text-white/80">
              ({calculateRate(totalStats.opened, totalStats.sent)}%)
            </span>
          </span>
        </div>

        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} rounded-xl px-5 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-indigo-500/30`}>
          <div className="flex items-center gap-2 mb-2">
            <CursorArrowRaysIcon className="w-5 h-5 text-white" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Clicked</span>
          </div>
          <span className="text-3xl font-bold text-white">
            {totalStats.clicked.toLocaleString()}
            <span className="text-base font-medium ml-2 text-white/80">
              ({calculateRate(totalStats.clicked, totalStats.sent)}%)
            </span>
          </span>
        </div>

        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} rounded-xl px-5 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-indigo-500/30`}>
          <div className="flex items-center gap-2 mb-2">
            <ChartBarIcon className="w-5 h-5 text-white" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Total Campaigns</span>
          </div>
          <span className="text-3xl font-bold text-white">{totalCompanies}</span>
        </div>
      </div>

      {/* your ERP Campaign Success Banner */}
      {erpResult && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PaperAirplaneIcon className="h-6 w-6 text-green-400" />
            <span className="text-green-400 font-bold">
              your ERP Campaign Sent! {erpResult.sent}/{erpResult.total} emails delivered to {erpResult.companyCount} companies.
              {erpResult.failed > 0 && ` (${erpResult.failed} failed)`}
            </span>
          </div>
          <button onClick={() => setErpResult(null)} className="text-green-400 hover:text-green-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* All Campaign Templates — Dynamic from data */}
      {[
        { id: 'erp', title: 'ERP + ERP NEXT', icon: '🔥', color: '#FF6B35', desc: 'Pick one, send to a batch, compare open rates', subjects: [
          { subject: "{{companyName}}'s your ERP team ready for 2026.1?", tag: 'Personal' },
          { subject: "your system just launched — where's your talent?", tag: 'Urgency' },
          { subject: "82% of firms can't find your ERP talent — here's how we solve it", tag: 'Data hook' },
          { subject: "Quick question about {{companyName}}'s your ERP roadmap", tag: 'Top pick' },
          { subject: "your ERP 2026.1 + your system — does {{companyName}} have the right engineers?", tag: 'News' },
        ]},
        { id: 'ai', title: 'AI CONSULTING — Get AI Projects', icon: '🤖', color: '#8B5CF6', desc: 'Target: companies stuck in AI pilot mode', subjects: [
          { subject: "67% of Fortune 500 deployed AI agents this year. Has {{companyName}}?", tag: 'FOMO' },
          { subject: "Quick question about {{companyName}}'s AI roadmap", tag: 'Top pick' },
          { subject: "The AI skills gap is real — 91% of companies are stuck in pilot mode", tag: 'Data hook' },
          { subject: "{{companyName}} + AI agents: 15-min strategy call?", tag: 'Direct' },
          { subject: "Your competitors just deployed AI agents. Here's how to catch up.", tag: 'Urgency' },
        ]},
        { id: 'cloud', title: 'CLOUD & PLATFORM ENGINEERING', icon: '☁️', color: '#0EA5E9', desc: 'Kubernetes, IDP, DevOps, SRE talent', subjects: [
          { subject: "Platform Engineering is the #1 growing role — does {{companyName}} have one?", tag: 'Top pick' },
          { subject: "90% of orgs face cloud skills gaps. Here's the fastest fix.", tag: 'Data hook' },
          { subject: "Quick question about {{companyName}}'s Kubernetes strategy", tag: 'Personal' },
          { subject: "Cloud engineers take 89 days to hire. We deliver in 48 hours.", tag: 'Contrast' },
          { subject: "{{companyName}}'s DevOps team ready for platform engineering?", tag: 'Direct' },
        ]},
        { id: 'cyber', title: 'CYBERSECURITY', icon: '🔒', color: '#DC2626', desc: 'Zero Trust, SOC, pen testing, compliance', subjects: [
          { subject: "$4.88M per breach. Is {{companyName}}'s security team big enough?", tag: 'FOMO' },
          { subject: "3.5 million cybersecurity jobs unfilled — we fill yours in 48hrs", tag: 'Data hook' },
          { subject: "Quick question about {{companyName}}'s security posture", tag: 'Top pick' },
          { subject: "OSCP-certified pen testers, SOC analysts, Zero Trust architects — ready now", tag: 'Direct' },
          { subject: "{{companyName}}'s security gaps won't wait. Neither should you.", tag: 'Urgency' },
        ]},
        { id: 'data', title: 'DATA ENGINEERING', icon: '📊', color: '#059669', desc: 'Spark, Snowflake, real-time pipelines', subjects: [
          { subject: "Every AI project starts with data. Does {{companyName}} have the engineers?", tag: 'Top pick' },
          { subject: "Data engineers take 85 days to hire. We deliver in 48 hours.", tag: 'Contrast' },
          { subject: "Quick question about {{companyName}}'s data platform", tag: 'Personal' },
          { subject: "Spark, Snowflake, real-time pipelines — pre-vetted talent ready now", tag: 'Direct' },
          { subject: "{{companyName}}'s data pipeline is the bottleneck. Let's fix it.", tag: 'Urgency' },
        ]},
        { id: 'fullstack', title: 'FULL-STACK ENGINEERING', icon: '⚡', color: '#F59E0B', desc: 'React, Next.js, AI-augmented development', subjects: [
          { subject: "Full-stack engineers who use AI to ship 2-3x faster — ready for {{companyName}}", tag: 'Top pick' },
          { subject: "React + Next.js + AI-augmented dev: the 2026 full-stack stack", tag: 'News' },
          { subject: "Quick question about {{companyName}}'s product engineering team", tag: 'Personal' },
          { subject: "Your next full-stack hire should ship product, not just code", tag: 'Direct' },
          { subject: "{{companyName}} needs engineers who build — we have them ready in 48hrs", tag: 'Urgency' },
        ]},
        { id: 'mobile', title: 'MOBILE ENGINEERING', icon: '📱', color: '#EC4899', desc: 'iOS Swift, Android Kotlin, React Native, Flutter', subjects: [
          { subject: "SwiftUI + Jetpack Compose engineers — ready for {{companyName}} in 48hrs", tag: 'Direct' },
          { subject: "Quick question about {{companyName}}'s mobile app team", tag: 'Top pick' },
          { subject: "On-device AI is the new baseline. Does your mobile team know it?", tag: 'News' },
          { subject: "iOS & Android engineers who build apps people actually love", tag: 'Emotional' },
          { subject: "{{companyName}}'s next mobile hire should know on-device ML. We have them.", tag: 'Urgency' },
        ]},
        { id: 'onboard', title: 'READY TO ONBOARD — Sign & Start', icon: '⚡', color: '#10B981', desc: 'Signing flow + verification email needs fixing', wip: true, subjects: [
          { subject: "Skip the sales call. Sign and get profiles in 48 hours.", tag: 'Direct' },
          { subject: "No commitment. No minimum. Cancel anytime. Ready to start?", tag: 'Top pick' },
          { subject: "{{companyName}}: ready to onboard? Profiles in 48 hours, zero lock-in.", tag: 'Personal' },
          { subject: "2-page agreement, 48-hour profiles, $2/hr. That's it.", tag: 'Simple' },
          { subject: "Most firms need 3 calls to start. We need 1 signature.", tag: 'Contrast' },
        ]},
      ].map((template) => (
        <div key={template.id} className="mb-4 rounded-xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${template.color}12, ${template.color}06)`, border: `1px solid ${template.color}33` }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${template.color}25` }}>
            <span style={{ fontSize: '16px' }}>{template.icon}</span>
            <span className="text-sm font-bold tracking-wide" style={{ color: template.color }}>{template.title}</span>
            {template.wip && <span className="text-xs px-2 py-1 rounded-full font-semibold ml-1" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>WIP</span>}
            <span className="text-xs ml-auto" style={{ color: '#8A8F98' }}>{template.desc}</span>
          </div>
          <div className="p-3 flex flex-col gap-1.5">
            {template.subjects.map((c, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-lg px-4 py-2.5 cursor-pointer transition-all hover:scale-[1.005]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={() => {
                  if (template.wip) return;
                  setWizardPreselect({ subject: c.subject, campaignType: template.id });
                  setShowCreateModal(true);
                }}
              >
                <div className="flex items-center justify-center rounded-full font-bold text-xs" style={{ width: '24px', height: '24px', background: `linear-gradient(135deg, ${template.color}, ${template.color}CC)`, color: '#fff', flexShrink: 0 }}>
                  {idx + 1}
                </div>
                <span className="text-sm flex-1" style={{ color: template.wip ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {c.subject.replace(/\{\{companyName\}\}/g, '[Company]')}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                  background: c.tag === 'Top pick' ? 'rgba(16,185,129,0.15)' : `${template.color}18`,
                  color: c.tag === 'Top pick' ? '#10B981' : template.color,
                  border: c.tag === 'Top pick' ? '1px solid rgba(16,185,129,0.3)' : `1px solid ${template.color}30`,
                }}>
                  {c.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Filters with gradient when selected */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {['all', 'draft', 'scheduled', 'active', 'completed', 'paused'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ease-in-out capitalize tracking-wide ${
              filterStatus === status
                ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white border border-indigo-500/30 shadow-lg hover:shadow-xl hover:scale-105`
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-2 border-[var(--border-default)] hover:bg-[var(--glass-hover)] hover:border-[var(--border-default)] hover:scale-105 shadow-sm'
            }`}
          >
            {status === 'all' ? 'All Campaigns' : status}
          </button>
        ))}
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-[var(--bg-elevated)] rounded-xl shadow-lg border border-[var(--border-default)]">
          <div className="p-12 text-center">
            <MegaphoneIcon className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">No campaigns found</h3>
            <p className="text-[var(--text-secondary)] mb-6 text-lg">
              {filterStatus === 'all'
                ? 'Create your first campaign to get started'
                : `No ${filterStatus} campaigns found`}
            </p>
            {filterStatus === 'all' && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 mx-auto tracking-wide border border-indigo-500/30`}
              >
                <PlusIcon className="h-5 w-5" />
                Create Your First Campaign
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-[var(--bg-elevated)] rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-1 border border-[var(--border-default)]"
              onClick={() => {
                // Navigate to analytics page if campaign has been sent
                if (campaign.sentCount > 0) {
                  navigate(`/campaigns/${campaign.id}/analytics`);
                } else {
                  setSelectedCampaign(campaign);
                  setShowDetailModal(true);
                }
              }}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {campaign.name.startsWith('Follow-up:') && (
                        <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          FOLLOW-UP
                        </span>
                      )}
                      <h3 className="text-2xl font-bold text-[var(--text-primary)]">{campaign.name}</h3>
                      <span className={getStatusBadge(campaign.status)}>{campaign.status}</span>
                      {sendResult?.id === campaign.id && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/30">
                          ✓ Sent to {sendResult.sent}/{sendResult.total} contacts
                        </span>
                      )}
                    </div>
                    {campaign.subject && (
                      <p className="text-base text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                        <EnvelopeIcon className="h-5 w-5 inline" />
                        {campaign.subject}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] font-medium">
                      <span>Created {formatDate(campaign.createdAt)}</span>
                      {campaign.scheduledDate && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4 inline" />
                            Scheduled for {formatDate(campaign.scheduledDate)}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>by {campaign.createdBy}</span>
                    </div>
                  </div>
                  {/* Send Now button — shown for draft/scheduled campaigns */}
                  {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                    <button
                      onClick={(e) => handleSendNow(e, campaign.id)}
                      disabled={sendingCampaignId === campaign.id}
                      className={`ml-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-semibold text-sm shadow hover:shadow-lg disabled:opacity-60 transition-all whitespace-nowrap`}
                    >
                      {sendingCampaignId === campaign.id ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-4 w-4" />
                          Send Now
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Campaign Stats */}
                {campaign.sentCount > 0 && (
                  <div className="border-t border-[var(--border-subtle)] pt-4">
                    <div className="grid grid-cols-4 gap-6">
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-1 font-medium uppercase tracking-wider">Sent</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                          {campaign.sentCount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-1 font-bold uppercase tracking-wider">Opened</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                          {campaign.openedCount.toLocaleString()}
                          <span className="text-sm text-[var(--text-secondary)] ml-2 font-medium">
                            ({calculateRate(campaign.openedCount, campaign.sentCount)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-1 font-bold uppercase tracking-wider">Clicked</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                          {campaign.clickedCount.toLocaleString()}
                          <span className="text-sm text-[var(--text-secondary)] ml-2 font-medium">
                            ({calculateRate(campaign.clickedCount, campaign.sentCount)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-1 font-bold uppercase tracking-wider">Converted</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                          {campaign.convertedCount.toLocaleString()}
                          <span className="text-sm text-[var(--text-secondary)] ml-2 font-medium">
                            ({calculateRate(campaign.convertedCount, campaign.sentCount)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="w-full bg-[var(--glass-bg)] rounded-full h-3 shadow-inner">
                        <div className="flex h-3 rounded-full overflow-hidden">
                          <div
                            className={`bg-gradient-to-r ${gradients.semantic.success?.gradient || gradients.brand.primary.gradient} shadow-sm`}
                            style={{
                              width: `${calculateRate(campaign.openedCount, campaign.sentCount)}%`,
                            }}
                          ></div>
                          <div
                            className={`bg-gradient-to-r ${gradients.brand.primary.gradient} shadow-sm`}
                            style={{
                              width: `${calculateRate(campaign.clickedCount, campaign.sentCount)}%`,
                            }}
                          ></div>
                          <div
                            className={`bg-gradient-to-r ${gradients.brand.primary.gradient} shadow-sm`}
                            style={{
                              width: `${calculateRate(campaign.convertedCount, campaign.sentCount)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Detail Modal */}
      {showDetailModal && selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCampaign(null);
          }}
          navigate={navigate}
        />
      )}

      {/* Create Campaign Wizard */}
      {showCreateModal && (
        <CampaignWizard
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setWizardPreselect(null); }}
          onSuccess={() => {
            loadCampaigns();
          }}
          preselect={wizardPreselect}
        />
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && editCampaign && (
        <EditCampaignModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditCampaign(null);
          }}
          campaignId={editCampaign.id}
          campaignName={editCampaign.name}
          onSuccess={() => {
            loadCampaigns();
          }}
        />
      )}

      {/* Help Guide */}
      {showHelpGuide && (
        <CampaignsHelpGuide onClose={() => setShowHelpGuide(false)} />
      )}
    </div>
  );
}

// Campaign Detail Modal Component
interface CampaignDetailModalProps {
  campaign: Campaign;
  onClose: () => void;
  navigate: (path: string) => void;
}

function CampaignDetailModal({ campaign, onClose, navigate }: CampaignDetailModalProps) {
  const { gradients } = useTheme();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadCampaignCompanies();
  }, [campaign.id]);

  const loadCampaignCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/${campaign.id}/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load companies');
      }

      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (err) {
      console.error('Error loading campaign companies:', err);
      setError('Failed to load companies. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-[#12121f] text-[#CBD5E1] border-2 border-[#33335a]',
      scheduled: `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white border-2 border-transparent`,
      active: `bg-gradient-to-r ${gradients.semantic.success?.gradient || gradients.brand.primary.gradient} text-white border-2 border-transparent`,
      completed: `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white border-2 border-transparent`,
      paused: 'bg-[#12121f] text-[#CBD5E1] border-2 border-[#33335a]',
    };
    return `px-3 py-1 rounded-full text-xs font-bold shadow-sm ${badges[status] || 'bg-[#12121f] text-[#CBD5E1] border-2 border-[#33335a]'}`;
  };

  const calculateRate = (count: number, total: number) => {
    if (total === 0) return '0';
    return ((count / total) * 100).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#161625] rounded-xl shadow-xl border-2 border-[#2a2a44] max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-white p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold">{campaign.name}</h2>
                <span className={getStatusBadge(campaign.status)}>{campaign.status}</span>
              </div>
              {campaign.subject && (
                <p className="text-lg opacity-90 flex items-center gap-2">
                  <EnvelopeIcon className="h-5 w-5" />
                  {campaign.subject}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-[#161625] hover:bg-opacity-20 rounded-xl transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Campaign Stats */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Campaign Performance</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Sent</div>
                <div className="text-2xl font-bold">
                  {campaign.sentCount.toLocaleString()}
                </div>
              </div>
              <div className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Opened</div>
                <div className="text-2xl font-bold">
                  {campaign.openedCount.toLocaleString()}
                  <span className="text-base font-medium ml-1 opacity-90">
                    ({calculateRate(campaign.openedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </div>
              <div className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Clicked</div>
                <div className="text-2xl font-bold">
                  {campaign.clickedCount.toLocaleString()}
                  <span className="text-base font-medium ml-1 opacity-90">
                    ({calculateRate(campaign.clickedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </div>
              <div className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Converted</div>
                <div className="text-2xl font-bold">
                  {campaign.convertedCount.toLocaleString()}
                  <span className="text-base font-medium ml-1 opacity-90">
                    ({calculateRate(campaign.convertedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Companies List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BuildingOfficeIcon className="h-6 w-6" />
                Companies in Campaign
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl border border-indigo-500/30 transition-all shadow-md hover:scale-105"
              >
                <PencilIcon className="h-5 w-5" />
                <span>Edit Companies</span>
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-500`}></div>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border-2 border-red-300 rounded-xl p-4 text-center shadow-md">
                <p className="text-red-600 font-bold">{error}</p>
                <button
                  onClick={loadCampaignCompanies}
                  className="mt-2 text-red-600 hover:text-red-400 font-bold underline"
                >
                  Try Again
                </button>
              </div>
            ) : companies.length === 0 ? (
              <div className="bg-[#12121f] rounded-xl p-8 text-center shadow-sm">
                <BuildingOfficeIcon className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)] font-bold">No companies in this campaign</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className="bg-[#161625] border-2 border-[#2a2a44] rounded-xl p-4 hover:shadow-md hover:border-orange-300 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${gradients.brand.primary.gradient.replace('to-r', 'to-br')} rounded-xl flex items-center justify-center shadow-md`}>
                        <BuildingOfficeIcon className="h-6 w-6 text-white" />
                      </div>
                      <span className="font-bold text-[var(--text-primary)]">{company.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/companies/${company.id}`);
                      }}
                      className={`px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:shadow-lg tracking-wide`}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#2a2a44] p-4 bg-[#12121f]">
          <button
            onClick={onClose}
            className={`w-full px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide`}
          >
            Close
          </button>
        </div>
      </div>

      {/* Edit Campaign Modal */}
      {showEditModal && (
        <EditCampaignModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          campaignId={campaign.id}
          campaignName={campaign.name}
          onSuccess={() => {
            loadCampaignCompanies();
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}
