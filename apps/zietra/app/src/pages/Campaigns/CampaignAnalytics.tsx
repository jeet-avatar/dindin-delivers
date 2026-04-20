import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, MousePointer, Eye, TrendingUp, Users, Clock, MapPin, Monitor, Smartphone, Download, Send, BarChart3, Activity } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  sentAt: string;
}

interface Stats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  openRate: string;
  clickRate: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: { name: string } | null;
}

interface EmailLog {
  id: string;
  contact: Contact;
  status: string;
  sentAt: string;
  totalOpens: number;
  totalClicks: number;
  engagementScore: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  ipAddress: string | null;
  deviceType: string | null;
  emailClient: string | null;
  browser: string | null;
  location: string | null;
  recentEvents: any[];
}

interface TopPerformer {
  contact: Contact;
  engagementScore: number;
  opens: number;
  clicks: number;
  firstOpenedAt: string | null;
  firstClickedAt: string | null;
}

interface AnalyticsData {
  campaign: Campaign;
  stats: Stats;
  topPerformers: TopPerformer[];
  emailLogs: EmailLog[];
}

export default function CampaignAnalytics() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
    // Refresh every 10 seconds to get real-time updates
    const interval = setInterval(loadAnalytics, 10000);
    return () => clearInterval(interval);
  }, [campaignId]);

  const loadAnalytics = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');

      // Try the tracking analytics endpoint first (has full engagement data)
      const trackingRes = await fetch(`${API_URL}/api/tracking/analytics/${campaignId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (trackingRes.ok) {
        const data = await trackingRes.json();
        setAnalytics(data);
        setLoading(false);
        return;
      }

      // Fallback: use campaign API if tracking endpoint fails
      if (!token) throw new Error('Not logged in');
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const campaignRes = await fetch(`${API_URL}/api/campaigns/${campaignId}`, { headers });
      if (!campaignRes.ok) throw new Error('Campaign not found');
      const campaignData = await campaignRes.json();
      const campaign = campaignData.campaign;
      if (!campaign) throw new Error('Campaign not found');

      const totalSent = campaign.totalSent || campaign._count?.emailLogs || 0;
      const totalOpened = campaign.totalOpened || 0;
      const totalClicked = campaign.totalClicked || 0;
      const totalBounced = campaign.totalBounced || 0;

      // Build recipient list from linked companies
      const emailLogs: EmailLog[] = [];
      if (campaign.companies) {
        for (const cc of campaign.companies) {
          const company = cc.company;
          if (company?.contacts) {
            for (const contact of company.contacts) {
              emailLogs.push({
                id: contact.id,
                contact: { id: contact.id, firstName: contact.firstName || '', lastName: contact.lastName || '', email: contact.email || '', company: { name: company.name || '' } },
                status: totalSent > 0 ? 'QUEUED' : 'PENDING',
                sentAt: campaign.sentAt || campaign.createdAt,
                totalOpens: 0, totalClicks: 0, engagementScore: 0,
                firstOpenedAt: null, lastOpenedAt: null, ipAddress: null,
                deviceType: null, emailClient: null, browser: null, location: null, recentEvents: [],
              });
            }
          }
        }
      }

      setAnalytics({
        campaign: { id: campaign.id, name: campaign.name, subject: campaign.subject || '', status: campaign.status, sentAt: campaign.sentAt || campaign.createdAt },
        stats: { totalSent: totalSent || emailLogs.length, totalOpened, totalClicked, totalBounced, openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0', clickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0' },
        topPerformers: [],
        emailLogs,
      });
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-[#94A3B8]">Loading analytics...</div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="text-5xl">📊</div>
        <div className="text-xl font-bold text-[#F1F5F9]">Campaign Analytics</div>
        <div className="text-sm text-[#94A3B8] max-w-md text-center">
          {error === 'Campaign not found'
            ? 'This campaign could not be found. It may have been deleted.'
            : 'Analytics data is not available yet. Email tracking data will appear here once recipients open or click your emails.'}
        </div>
        <button
          onClick={() => navigate('/campaigns')}
          className="mt-4 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, subtext, color }: any) => (
    <div className="bg-[#161625] border-2 border-[#2a2a44] rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[#F1F5F9]">{value}</div>
          {subtext && <div className="text-sm text-[#94A3B8] mt-1">{subtext}</div>}
        </div>
      </div>
      <div className="text-sm text-[#94A3B8] font-medium mt-2">{label}</div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/campaigns')}
        className="flex items-center gap-2 text-[#94A3B8] hover:text-[#F1F5F9] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium">Back to Campaigns</span>
      </button>

      {/* Enhanced Campaign Header */}
      <div className="bg-[#161625] rounded-xl border-2 border-[#2a2a44] p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#F1F5F9] mb-2">
              {analytics.campaign.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-[#94A3B8] mb-3">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {analytics.campaign.subject}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Sent: {new Date(analytics.campaign.sentAt).toLocaleString()}
              </span>
            </div>

            {/* Campaign metadata */}
            <div className="flex gap-3 mt-4">
              <span className="px-3 py-1 bg-green-500/15 text-green-400 rounded-full text-xs font-medium uppercase">
                {analytics.campaign.status}
              </span>
              <span className="text-sm text-[#94A3B8] flex items-center gap-1">
                <Users className="w-4 h-4" />
                Recipients: {analytics.stats.totalSent} contact{analytics.stats.totalSent !== 1 ? 's' : ''}
              </span>
              <span className="text-sm text-[#94A3B8] flex items-center gap-1">
                <Activity className="w-4 h-4" />
                Auto-refreshing every 10s
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!analytics) return;
                const rows = [['Name', 'Email', 'Company', 'Status', 'Opens', 'Clicks', 'Engagement']];
                analytics.emailLogs.forEach(log => {
                  rows.push([
                    `${log.contact.firstName} ${log.contact.lastName}`,
                    log.contact.email,
                    log.contact.company?.name || '',
                    log.status,
                    String(log.totalOpens),
                    String(log.totalClicks),
                    String(log.engagementScore),
                  ]);
                });
                const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${analytics.campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 border-2 border-[#33335a] rounded-lg hover:bg-[#12121f] transition-colors font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button
              onClick={() => {
                // Store follow-up context for the campaign wizard
                const followUpData = {
                  isFollowUp: true,
                  originalCampaignId: analytics.campaign.id,
                  originalName: analytics.campaign.name,
                  originalSubject: analytics.campaign.subject,
                  recipients: analytics.emailLogs.map(log => ({
                    contactId: log.contact.id,
                    name: `${log.contact.firstName} ${log.contact.lastName}`,
                    email: log.contact.email,
                    company: log.contact.company?.name || '',
                  })),
                };
                sessionStorage.setItem('followUpCampaign', JSON.stringify(followUpData));
                navigate('/campaigns?followup=true');
              }}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Follow-up
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          icon={Mail}
          label="Total Sent"
          value={analytics.stats.totalSent}
          color="bg-gradient-to-r from-indigo-500 to-purple-600"
        />
        <StatCard
          icon={Eye}
          label="Opened"
          value={analytics.stats.totalOpened}
          subtext={`${analytics.stats.openRate}% open rate`}
          color="bg-green-600"
        />
        <StatCard
          icon={MousePointer}
          label="Clicked"
          value={analytics.stats.totalClicked}
          subtext={`${analytics.stats.clickRate}% click rate`}
          color="bg-gradient-to-r from-indigo-500 to-purple-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Bounced"
          value={analytics.stats.totalBounced}
          color="bg-red-600"
        />
      </div>

      {/* Top Performers */}
      {analytics.topPerformers.length > 0 && analytics.topPerformers[0].engagementScore > 0 && (
        <div className="bg-[#161625] border-2 border-[#2a2a44] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-[#F1F5F9] mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Top Engaged Recipients
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.topPerformers.slice(0, 6).map((performer) => (
              <div key={performer.contact.id} className="border border-[#2a2a44] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-[#F1F5F9]">
                    {performer.contact.firstName} {performer.contact.lastName}
                  </div>
                  <div className="text-lg font-bold text-indigo-400">
                    {performer.engagementScore}
                  </div>
                </div>
                <div className="text-sm text-[#94A3B8] mb-2">{performer.contact.email}</div>
                <div className="flex gap-4 text-xs text-[#94A3B8]">
                  <span>{performer.opens} opens</span>
                  <span>{performer.clicks} clicks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Email Logs Table */}
      <div className="bg-[#161625] border-2 border-[#2a2a44] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Email Activity Details
          </h2>
          <span className="text-sm text-[#94A3B8]">
            {analytics.emailLogs.length} recipient{analytics.emailLogs.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#12121f] border-b-2 border-[#2a2a44]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#94A3B8] uppercase">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#94A3B8] uppercase">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#94A3B8] uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#94A3B8] uppercase">
                  Opens/Clicks
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#94A3B8] uppercase">
                  First Opened
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#94A3B8] uppercase">
                  Device/Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#94A3B8] uppercase">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#94A3B8] uppercase">
                  Engagement
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a44]">
              {analytics.emailLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#12121f] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#F1F5F9]">
                      {log.contact.firstName} {log.contact.lastName}
                    </div>
                    <div className="text-sm text-[#94A3B8]">{log.contact.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-[#94A3B8]">
                      {log.contact.company?.name || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'OPENED'
                          ? 'bg-green-500/15 text-green-400'
                          : log.status === 'CLICKED'
                          ? 'bg-rose-500/15 text-rose-400'
                          : log.status === 'SENT'
                          ? 'bg-orange-500/15 text-orange-400'
                          : 'bg-[#1c1c30] text-[#CBD5E1]'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-green-500" />
                        <span className="font-semibold text-[#F1F5F9]">{log.totalOpens}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MousePointer className="w-4 h-4 text-rose-500" />
                        <span className="font-semibold text-[#F1F5F9]">{log.totalClicks}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-[#94A3B8]">
                      {log.firstOpenedAt ? (
                        <>
                          <div>{new Date(log.firstOpenedAt).toLocaleDateString()}</div>
                          <div className="text-xs text-[#94A3B8]">
                            {new Date(log.firstOpenedAt).toLocaleTimeString()}
                          </div>
                        </>
                      ) : (
                        '-'
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {log.deviceType || log.emailClient ? (
                      <div className="text-sm">
                        {log.deviceType && (
                          <div className="flex items-center gap-1 text-[#CBD5E1]">
                            {log.deviceType === 'mobile' ? (
                              <Smartphone className="w-3 h-3" />
                            ) : (
                              <Monitor className="w-3 h-3" />
                            )}
                            <span className="capitalize">{log.deviceType}</span>
                          </div>
                        )}
                        {log.emailClient && (
                          <div className="text-xs text-[#94A3B8]">{log.emailClient}</div>
                        )}
                        {log.browser && (
                          <div className="text-xs text-[#94A3B8]">{log.browser}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-[#64748B]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-[#94A3B8]">
                      {log.location || log.ipAddress ? (
                        <>
                          {log.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {log.location}
                            </div>
                          )}
                          {log.ipAddress && (
                            <div className="text-xs text-[#94A3B8]">{log.ipAddress}</div>
                          )}
                        </>
                      ) : (
                        '-'
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-[60px] h-2 bg-[#252540] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            log.engagementScore >= 70
                              ? 'bg-gradient-to-r from-green-500 to-green-600'
                              : log.engagementScore >= 40
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                              : 'bg-gradient-to-r from-gray-400 to-[#12121f]0'
                          }`}
                          style={{ width: `${log.engagementScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-[#F1F5F9] min-w-[30px]">
                        {log.engagementScore}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {analytics.emailLogs.length === 0 && (
          <div className="text-center py-12">
            <Mail className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
            <p className="text-[#94A3B8] text-lg font-medium">No email activity yet</p>
            <p className="text-[#64748B] text-sm mt-2">
              Analytics will appear here once recipients open the emails
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
