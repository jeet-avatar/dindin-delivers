import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  MessageSquare,
  UserPlus,
  ArrowLeft,
  Trash2,
  Mail,
  BarChart3,
  ClipboardList,
  ChevronRight,
  Activity,
  Zap,
  CheckCircle,
  XCircle,
  Minus,
  Lock,
  Save,
  ToggleLeft,
  ToggleRight,
  Key,
  Database,
} from "lucide-react";
import {
  listTeamMembers,
  listAllTeamChats,
  inviteMember,
  getStats,
  changeRole,
  deleteUser,
  getAuditLog,
  sendPasswordReset,
  type TeamMember,
  type AdminChat,
  type AdminStats,
  type AuditEntry,
} from "../services/adminService";
import { getAccessToken } from "../services/api";
import KnowledgeBaseTab from "../components/KnowledgeBaseTab";

type Tab = "overview" | "members" | "chats" | "invite" | "audit" | "security" | "license" | "knowledge";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [chats, setChats] = useState<AdminChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [chatsLoaded, setChatsLoaded] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);

  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditLoaded, setAuditLoaded] = useState(false);

  const [resetSentId, setResetSentId] = useState<number | null>(null);

  // Security tab state
  const [ssoMetadataUrl, setSsoMetadataUrl] = useState("");
  const [ssoClientId, setSsoClientId] = useState("");
  const [ssoClientSecret, setSsoClientSecret] = useState("");
  const [ssoSaving, setSsoSaving] = useState(false);
  const [ssoSaved, setSsoSaved] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  const [ipAllowlist, setIpAllowlist] = useState("");
  const [ipSaving, setIpSaving] = useState(false);
  const [ipSaved, setIpSaved] = useState(false);
  const [ipError, setIpError] = useState<string | null>(null);

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSaving, setMfaSaving] = useState(false);
  const [securityLoaded, setSecurityLoaded] = useState(false);

  // License tab state
  const [licenseInfo, setLicenseInfo] = useState<{ valid?: boolean; plan?: string; days_remaining?: number; mode?: string } | null>(null);
  const [licenseInfoLoaded, setLicenseInfoLoaded] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [licenseValidating, setLicenseValidating] = useState(false);
  const [licenseValidResult, setLicenseValidResult] = useState<{ valid: boolean; plan?: string; expiry?: string; message?: string } | null>(null);

  // Load members on mount
  useEffect(() => {
    setMembersLoading(true);
    listTeamMembers()
      .then((data) => { setMembers(data); setMembersError(null); })
      .catch((err: Error) => setMembersError(err.message))
      .finally(() => setMembersLoading(false));
  }, []);

  // Load stats on overview mount
  useEffect(() => {
    if ((activeTab === "overview" || activeTab === "members") && !statsLoaded) {
      setStatsLoading(true);
      getStats()
        .then((data) => { setStats(data); setStatsLoaded(true); })
        .catch(() => {})
        .finally(() => setStatsLoading(false));
    }
  }, [activeTab, statsLoaded]);

  useEffect(() => {
    if (activeTab === "chats" && !chatsLoaded) {
      setChatsLoading(true);
      listAllTeamChats()
        .then((data) => { setChats(data); setChatsError(null); setChatsLoaded(true); })
        .catch((err: Error) => setChatsError(err.message))
        .finally(() => setChatsLoading(false));
    }
  }, [activeTab, chatsLoaded]);

  useEffect(() => {
    if (activeTab === "audit" && !auditLoaded) {
      setAuditLoading(true);
      getAuditLog()
        .then((data) => { setAuditLog(data); setAuditError(null); setAuditLoaded(true); })
        .catch((err: Error) => setAuditError(err.message))
        .finally(() => setAuditLoading(false));
    }
  }, [activeTab, auditLoaded]);

  // Load license info when License tab first opened
  useEffect(() => {
    if (activeTab === "license" && !licenseInfoLoaded) {
      const token = getAccessToken();
      fetch("/api/admin/license", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setLicenseInfo(data);
          setLicenseInfoLoaded(true);
        })
        .catch(() => setLicenseInfoLoaded(true)); // non-fatal
    }
  }, [activeTab, licenseInfoLoaded]);

  // Load SSO config when Security tab first opened
  useEffect(() => {
    if (activeTab === "security" && !securityLoaded) {
      const token = getAccessToken();
      fetch("/api/auth/sso/config", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.idp_metadata_url) setSsoMetadataUrl(data.idp_metadata_url);
          if (data.client_id) setSsoClientId(data.client_id);
          setSecurityLoaded(true);
        })
        .catch(() => setSecurityLoaded(true)); // non-fatal
    }
  }, [activeTab, securityLoaded]);

  function handleChangeRole(member: TeamMember) {
    const newRole = member.role === "admin" ? "user" : "admin";
    if (!window.confirm(`Change ${member.name}'s role to "${newRole}"?`)) return;
    changeRole(member.id, newRole)
      .then(() =>
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
        )
      )
      .catch((err: Error) => alert("Failed to change role: " + err.message));
  }

  function handleRemove(member: TeamMember) {
    if (!window.confirm(`Remove ${member.name} (${member.email}) from the team?`)) return;
    deleteUser(member.id)
      .then(() => setMembers((prev) => prev.filter((m) => m.id !== member.id)))
      .catch((err: Error) => alert("Failed to remove member: " + err.message));
  }

  async function handleSendReset(userId: number) {
    try {
      await sendPasswordReset(userId);
      setResetSentId(userId);
      setTimeout(() => setResetSentId(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to send reset email");
    }
  }

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleSaveSso(e: React.FormEvent) {
    e.preventDefault();
    setSsoSaving(true);
    setSsoError(null);
    setSsoSaved(false);
    try {
      const token = getAccessToken();
      const r = await fetch("/api/auth/sso/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({
          idp_metadata_url: ssoMetadataUrl,
          client_id: ssoClientId || null,
          client_secret: ssoClientSecret || null,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.detail ?? "Failed to save SSO config");
      }
      setSsoSaved(true);
      setTimeout(() => setSsoSaved(false), 3000);
    } catch (err: unknown) {
      setSsoError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSsoSaving(false);
    }
  }

  async function handleSaveIpAllowlist(e: React.FormEvent) {
    e.preventDefault();
    setIpSaving(true);
    setIpError(null);
    setIpSaved(false);
    try {
      const token = getAccessToken();
      const r = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ key: "ip_allowlist", value: ipAllowlist }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.detail ?? "Failed to save IP allowlist");
      }
      setIpSaved(true);
      setTimeout(() => setIpSaved(false), 3000);
    } catch (err: unknown) {
      setIpError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIpSaving(false);
    }
  }

  async function handleToggleMfa() {
    setMfaSaving(true);
    try {
      const token = getAccessToken();
      const newValue = !mfaRequired;
      await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ key: "mfa_required", value: newValue ? "true" : "false" }),
      });
      setMfaRequired(newValue);
    } catch {
      // non-fatal toggle
    } finally {
      setMfaSaving(false);
    }
  }

  async function handleValidateLicenseKey() {
    if (!licenseKeyInput.trim()) return;
    setLicenseValidating(true);
    setLicenseValidResult(null);
    try {
      const token = getAccessToken();
      const r = await fetch("/api/admin/license/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ license_key: licenseKeyInput.trim() }),
      });
      const data = await r.json();
      setLicenseValidResult(data);
    } catch {
      setLicenseValidResult({ valid: false, message: "Could not reach validation service" });
    } finally {
      setLicenseValidating(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(inviteEmail)) return;
    setInviteLoading(true);
    setInviteSuccess(null);
    setInviteError(null);
    try {
      await inviteMember(inviteEmail);
      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviteLoading(false);
    }
  }

  const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview",   label: "Overview",       icon: BarChart3 },
    { id: "members",    label: "Team",            icon: Users },
    { id: "chats",      label: "Chats",           icon: MessageSquare },
    { id: "invite",     label: "Invite",          icon: UserPlus },
    { id: "audit",      label: "Audit Log",       icon: ClipboardList },
    { id: "security",   label: "Security",        icon: Lock },
    { id: "license",    label: "License",         icon: Key },
    { id: "knowledge",  label: "Knowledge Base",  icon: Database },
  ];

  function getRoleInitials(name: string) {
    const parts = name.trim().split(" ");
    if (parts.length < 2) return parts[0][0]?.toUpperCase() || "U";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatRelativeTime(iso: string) {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-[#15181c] text-white flex flex-col md:flex-row">
      {/* Sidebar nav — vertical on desktop, horizontal tab bar on mobile */}
      <nav className="w-full md:w-56 flex-shrink-0 bg-[#0f1620] border-b border-slate-700/50 md:border-b-0 md:border-r md:border-slate-700/50 flex flex-col">
        {/* Back link — desktop only */}
        <div className="hidden md:block p-4 border-b border-slate-700/50">
          <button
            onClick={() => navigate("/chat/new")}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Chat
          </button>
        </div>

        {/* Logo/header — desktop only */}
        <div className="hidden md:block px-4 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Shield size={15} className="text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-semibold">Admin Panel</div>
              <div className="text-xs text-slate-500">ArthaBuild</div>
            </div>
          </div>
        </div>

        {/* Nav items — horizontal scroll on mobile, vertical list on desktop */}
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible p-2 gap-1 md:gap-0 flex-1 md:flex-none">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm transition-colors whitespace-nowrap md:mb-0.5 ${
                activeTab === id
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon size={14} />
              {label}
              {activeTab === id && <ChevronRight size={12} className="ml-auto hidden md:block" />}
            </button>
          ))}
        </div>

        {/* Team member count badge — desktop only */}
        {!membersLoading && (
          <div className="hidden md:block p-4 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {members.length} member{members.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="max-w-4xl space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Overview</h1>
              <p className="text-slate-400 mt-1 text-sm">Workspace at a glance</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statsLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 animate-pulse h-24" />
                ))
              ) : (
                <>
                  <StatCard icon={Users} label="Team Members" value={stats?.total_users ?? "—"} color="bg-indigo-600/20 text-indigo-400" />
                  <StatCard icon={MessageSquare} label="Total Chats" value={stats?.total_chats ?? "—"} color="bg-blue-600/20 text-blue-400" />
                  <StatCard icon={Activity} label="Active (24h)" value={stats?.active_sessions ?? "—"} color="bg-green-600/20 text-green-400" />
                  <StatCard icon={Zap} label="Scripts Deployed" value={stats?.scripts_deployed ?? "—"} color="bg-amber-600/20 text-amber-400" />
                </>
              )}
            </div>

            {/* Recent members */}
            <div>
              <h2 className="text-base font-semibold text-slate-200 mb-3">Team Members</h2>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                {membersLoading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-8 h-8 bg-slate-700 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-slate-700 rounded w-1/3" />
                          <div className="h-3 bg-slate-700 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : members.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No team members yet.</div>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                          {getRoleInitials(member.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{member.name}</div>
                          <div className="text-xs text-slate-400 truncate">{member.email}</div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            member.role === "admin"
                              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                              : "bg-slate-700 text-slate-300 border border-slate-600/50"
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent audit entries */}
            {auditLog.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-slate-200 mb-3">Recent Activity</h2>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                  <div className="divide-y divide-slate-700/50">
                    {auditLog.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center gap-4 px-5 py-3">
                        <div className="text-lg flex-shrink-0">
                          {entry.result === "success" ? (
                            <CheckCircle size={16} className="text-green-400" />
                          ) : entry.result === "failure" ? (
                            <XCircle size={16} className="text-red-400" />
                          ) : (
                            <Minus size={16} className="text-slate-500" />
                          )}
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-slate-700/60 text-slate-300 rounded font-mono flex-shrink-0">
                          {entry.action}
                        </span>
                        <span className="text-sm text-slate-400 truncate">{entry.actor_email}</span>
                        <span className="text-xs text-slate-500 ml-auto flex-shrink-0">
                          {formatRelativeTime(entry.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Team Members Tab ── */}
        {activeTab === "members" && (
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Team</h1>
                <p className="text-slate-400 mt-1 text-sm">All users in your ArthaBuild workspace</p>
              </div>
              <button
                onClick={() => setActiveTab("invite")}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
              >
                <UserPlus size={14} />
                Invite Member
              </button>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
              {membersLoading && (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 items-center animate-pulse">
                      <div className="w-10 h-10 bg-slate-700 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-slate-700 rounded w-1/4" />
                        <div className="h-3 bg-slate-700 rounded w-1/3" />
                      </div>
                      <div className="h-6 bg-slate-700 rounded w-14" />
                    </div>
                  ))}
                </div>
              )}

              {membersError && (
                <div className="p-6 text-sm text-red-400 bg-red-900/10 border-b border-red-900/20">
                  Failed to load team members: {membersError}
                </div>
              )}

              {!membersLoading && !membersError && (
                <div className="overflow-x-auto">
                <div className="min-w-[580px]">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_1.5fr_90px_120px_140px] px-5 py-3 bg-slate-900/40 border-b border-slate-700/50">
                    {["Name", "Email", "Role", "Joined", "Actions"].map((h) => (
                      <div key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</div>
                    ))}
                  </div>

                  <div className="divide-y divide-slate-700/30">
                    {members.length === 0 ? (
                      <div className="px-5 py-12 text-center text-slate-500 text-sm">No team members yet.</div>
                    ) : (
                      members.map((member) => (
                        <div
                          key={member.id}
                          className="grid grid-cols-[1fr_1.5fr_90px_120px_140px] px-5 py-3.5 items-center hover:bg-slate-700/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                              {getRoleInitials(member.name)}
                            </div>
                            <span className="text-sm font-medium text-white truncate">{member.name}</span>
                          </div>
                          <div className="text-sm text-slate-400 truncate pr-4">{member.email}</div>
                          <div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                member.role === "admin"
                                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                                  : "bg-slate-700 text-slate-300 border border-slate-600/50"
                              }`}
                            >
                              {member.role}
                            </span>
                          </div>
                          <div className="text-sm text-slate-500">
                            {new Date(member.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            {member.role !== "admin" && (
                              <button
                                onClick={() => handleChangeRole(member)}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 transition-colors"
                              >
                                Promote
                              </button>
                            )}
                            <button
                              onClick={() => handleSendReset(member.id)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                              {resetSentId === member.id ? (
                                <span className="text-green-400">Sent!</span>
                              ) : (
                                "Reset"
                              )}
                            </button>
                            {member.role !== "admin" && (
                              <button
                                onClick={() => handleRemove(member)}
                                className="p-1.5 rounded-lg hover:bg-red-900/20 text-slate-500 hover:text-red-400 transition-colors"
                                title="Remove member"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Team Chats Tab ── */}
        {activeTab === "chats" && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Team Chats</h1>
              <p className="text-slate-400 mt-1 text-sm">All chat sessions across your workspace</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
              {chatsLoading && (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="h-4 bg-slate-700 rounded w-2/5" />
                      <div className="h-4 bg-slate-700 rounded w-1/4" />
                      <div className="h-4 bg-slate-700 rounded w-28" />
                    </div>
                  ))}
                </div>
              )}

              {chatsError && (
                <div className="p-6 text-sm text-red-400">Failed to load team chats: {chatsError}</div>
              )}

              {!chatsLoading && !chatsError && (
                <div className="overflow-x-auto">
                <div className="min-w-[480px]">
                  <div className="grid grid-cols-[2fr_1.5fr_120px] px-5 py-3 bg-slate-900/40 border-b border-slate-700/50">
                    {["Chat Title", "Member", "Last Active"].map((h) => (
                      <div key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</div>
                    ))}
                  </div>

                  <div className="divide-y divide-slate-700/30">
                    {chats.length === 0 ? (
                      <div className="px-5 py-12 text-center text-slate-500 text-sm">No team chats yet.</div>
                    ) : (
                      chats.map((chat) => (
                        <div
                          key={chat.id}
                          className="grid grid-cols-[2fr_1.5fr_120px] px-5 py-3.5 items-center hover:bg-slate-700/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <MessageSquare size={14} className="text-slate-500 flex-shrink-0" />
                            <span className="text-sm text-white truncate">{chat.title}</span>
                          </div>
                          <div className="min-w-0 pr-4">
                            <div className="text-sm text-slate-300 truncate">{chat.user_name}</div>
                            <div className="text-xs text-slate-500 truncate">{chat.user_email}</div>
                          </div>
                          <div className="text-sm text-slate-500">
                            {formatRelativeTime(chat.updated_at)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Invite Tab ── */}
        {activeTab === "invite" && (
          <div className="max-w-lg space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Invite Member</h1>
              <p className="text-slate-400 mt-1 text-sm">Send an invitation to join your ArthaBuild workspace</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
              <form onSubmit={handleInvite} className="space-y-5">
                <div>
                  <label htmlFor="invite-email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail size={15} className="text-slate-500" />
                    </div>
                    <input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!inviteEmail || !isValidEmail(inviteEmail) || inviteLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <UserPlus size={15} />
                  {inviteLoading ? "Sending..." : "Send Invite"}
                </button>

                {inviteSuccess && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-green-900/20 border border-green-700/30 rounded-lg text-sm text-green-300">
                    <CheckCircle size={15} />
                    {inviteSuccess}
                  </div>
                )}

                {inviteError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-900/20 border border-red-700/30 rounded-lg text-sm text-red-300">
                    <XCircle size={15} />
                    {inviteError}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ── Audit Log Tab ── */}
        {activeTab === "audit" && (
          <div className="max-w-5xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Audit Log</h1>
              <p className="text-slate-400 mt-1 text-sm">Last 50 admin and auth events</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
              {auditLoading && (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-4 bg-slate-700 rounded animate-pulse w-3/4" />
                  ))}
                </div>
              )}
              {auditError && (
                <div className="p-6 text-sm text-red-400">{auditError}</div>
              )}
              {!auditLoading && !auditError && (
                <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[140px_1fr_80px_80px_100px_1fr_120px] px-5 py-3 bg-slate-900/40 border-b border-slate-700/50">
                    {["Action", "Actor", "Role", "Result", "IP", "Detail", "When"].map((h) => (
                      <div key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</div>
                    ))}
                  </div>

                  <div className="divide-y divide-slate-700/30">
                    {auditLog.length === 0 ? (
                      <div className="px-5 py-12 text-center text-slate-500 text-sm">No audit entries yet.</div>
                    ) : (
                      auditLog.map((entry) => (
                        <div
                          key={entry.id}
                          className="grid grid-cols-[140px_1fr_80px_80px_100px_1fr_120px] px-5 py-3 items-center hover:bg-slate-700/20 transition-colors text-sm"
                        >
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-900/60 text-slate-300 border border-slate-700/50 truncate max-w-[130px]">
                              {entry.action}
                            </span>
                          </div>
                          <div className="text-slate-300 truncate pr-3">{entry.actor_email}</div>
                          <div>
                            {entry.actor_role ? (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                entry.actor_role === "admin"
                                  ? "bg-indigo-600/20 text-indigo-300"
                                  : "bg-slate-700 text-slate-400"
                              }`}>
                                {entry.actor_role}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </div>
                          <div className="flex items-center">
                            {entry.result === "success" ? (
                              <CheckCircle size={14} className="text-green-400" />
                            ) : entry.result === "failure" ? (
                              <XCircle size={14} className="text-red-400" />
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </div>
                          <div className="font-mono text-xs text-slate-500 truncate">
                            {entry.ip_address ?? "—"}
                          </div>
                          <div className="text-slate-500 truncate pr-3" title={entry.detail ?? ""}>
                            {entry.detail ?? entry.target ?? "—"}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {formatRelativeTime(entry.created_at)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── License Tab ── */}
        {activeTab === "license" && (
          <div className="max-w-2xl space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-white">License</h1>
              <p className="text-slate-400 mt-1 text-sm">Manage your ArthaBuild license key and plan status</p>
            </div>

            {/* Current license info */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-amber-600/20 border border-amber-500/30">
                  <Key size={16} className="text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Current License</div>
                  <div className="text-xs text-slate-500">Your active plan and entitlements</div>
                </div>
              </div>

              {!licenseInfoLoaded ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-1/3" />
                  <div className="h-4 bg-slate-700 rounded w-1/4" />
                </div>
              ) : licenseInfo ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/40 rounded-lg p-4">
                    <div className="text-xs text-slate-500 mb-1">Status</div>
                    <div className="flex items-center gap-2">
                      {licenseInfo.valid ? (
                        <CheckCircle size={14} className="text-green-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                      <span className={`text-sm font-semibold ${licenseInfo.valid ? "text-green-300" : "text-red-300"}`}>
                        {licenseInfo.valid ? "Valid" : "Invalid"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-900/40 rounded-lg p-4">
                    <div className="text-xs text-slate-500 mb-1">Plan</div>
                    <div className="text-sm font-semibold text-white capitalize">
                      {licenseInfo.plan ?? "—"}
                    </div>
                  </div>
                  {licenseInfo.mode && (
                    <div className="bg-slate-900/40 rounded-lg p-4">
                      <div className="text-xs text-slate-500 mb-1">Mode</div>
                      <div className="text-sm text-white capitalize">{licenseInfo.mode}</div>
                    </div>
                  )}
                  {licenseInfo.days_remaining !== undefined && (
                    <div className="bg-slate-900/40 rounded-lg p-4">
                      <div className="text-xs text-slate-500 mb-1">Days Remaining</div>
                      <div className="text-sm text-white">{licenseInfo.days_remaining}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-500">Could not load license info.</div>
              )}
            </div>

            {/* Validate a new key */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 space-y-5">
              <div>
                <div className="text-sm font-semibold text-white mb-1">Validate a License Key</div>
                <div className="text-xs text-slate-500">Enter a new license key to validate it without editing server environment variables</div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value)}
                  placeholder="AB-XXXX-XXXX-XXXX-XXXX"
                  className="flex-1 px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 font-mono focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
                />
                <button
                  onClick={handleValidateLicenseKey}
                  disabled={!licenseKeyInput.trim() || licenseValidating}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  <Key size={14} />
                  {licenseValidating ? "Checking..." : "Validate"}
                </button>
              </div>

              {licenseValidResult && (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${
                  licenseValidResult.valid
                    ? "bg-green-900/20 border border-green-700/30 text-green-300"
                    : "bg-red-900/20 border border-red-700/30 text-red-300"
                }`}>
                  {licenseValidResult.valid ? (
                    <CheckCircle size={15} className="flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={15} className="flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    {licenseValidResult.valid ? (
                      <>
                        <div className="font-medium">Valid license</div>
                        <div className="text-xs mt-0.5 opacity-80">
                          Plan: <strong>{licenseValidResult.plan}</strong>
                          {licenseValidResult.expiry ? ` · Expires: ${licenseValidResult.expiry}` : ""}
                        </div>
                      </>
                    ) : (
                      <div>{licenseValidResult.message ?? "Invalid license key"}</div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500">
                To activate a new key on this instance, update <code className="bg-slate-700/60 px-1 py-0.5 rounded text-slate-300">LICENSE_KEY</code> in your environment and restart ArthaBuild.
                Contact <a href="mailto:sales@techcloudpro.com" className="text-indigo-400 hover:underline">sales@techcloudpro.com</a> to purchase or upgrade.
              </p>
            </div>
          </div>
        )}

        {/* ── Knowledge Base Tab ── */}
        {activeTab === "knowledge" && (
          <KnowledgeBaseTab />
        )}

        {/* ── Security Tab ── */}
        {activeTab === "security" && (
          <div className="max-w-2xl space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Security</h1>
              <p className="text-slate-400 mt-1 text-sm">SSO / IdP configuration, IP allowlist, and MFA policy</p>
            </div>

            {/* SSO Config */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30">
                  <Shield size={16} className="text-indigo-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">SSO / OIDC Configuration</div>
                  <div className="text-xs text-slate-500">Connect your Identity Provider (Google Workspace, Okta, Azure AD, etc.)</div>
                </div>
              </div>

              <form onSubmit={handleSaveSso} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">IdP Metadata / Discovery URL</label>
                  <input
                    type="url"
                    value={ssoMetadataUrl}
                    onChange={(e) => setSsoMetadataUrl(e.target.value)}
                    placeholder="https://accounts.google.com/.well-known/openid-configuration"
                    className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Client ID</label>
                    <input
                      type="text"
                      value={ssoClientId}
                      onChange={(e) => setSsoClientId(e.target.value)}
                      placeholder="your-client-id"
                      className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Client Secret</label>
                    <input
                      type="password"
                      value={ssoClientSecret}
                      onChange={(e) => setSsoClientSecret(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={!ssoMetadataUrl || ssoSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save size={14} />
                    {ssoSaving ? "Saving..." : "Save SSO Config"}
                  </button>
                  {ssoSaved && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Saved</span>}
                  {ssoError && <span className="text-xs text-red-400">{ssoError}</span>}
                </div>
              </form>
            </div>

            {/* IP Allowlist */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-amber-600/20 border border-amber-500/30">
                  <Lock size={16} className="text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">IP Allowlist</div>
                  <div className="text-xs text-slate-500">Restrict logins to specific IP ranges (CIDR notation, one per line)</div>
                </div>
              </div>

              <form onSubmit={handleSaveIpAllowlist} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">CIDR Ranges (one per line)</label>
                  <textarea
                    value={ipAllowlist}
                    onChange={(e) => setIpAllowlist(e.target.value)}
                    placeholder={"10.0.0.0/8\n192.168.1.0/24"}
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 font-mono focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all resize-none"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Leave empty to allow all IPs. Changes take effect on server restart.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={ipSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                  >
                    <Save size={14} />
                    {ipSaving ? "Saving..." : "Save IP Allowlist"}
                  </button>
                  {ipSaved && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Saved</span>}
                  {ipError && <span className="text-xs text-red-400">{ipError}</span>}
                </div>
              </form>
            </div>

            {/* MFA Policy */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-600/20 border border-green-500/30">
                  <Shield size={16} className="text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">MFA Policy</div>
                  <div className="text-xs text-slate-500">Require all team members to enroll in TOTP MFA</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-200">Require MFA for all users</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {mfaRequired
                      ? "Users without MFA enrolled will be prompted to set up MFA on next login."
                      : "MFA is optional — users can self-enroll via /mfa-setup."}
                  </div>
                </div>
                <button
                  onClick={handleToggleMfa}
                  disabled={mfaSaving}
                  className="ml-4 flex-shrink-0 transition-colors disabled:opacity-40"
                  aria-label="Toggle MFA requirement"
                >
                  {mfaRequired ? (
                    <ToggleRight size={32} className="text-green-400" />
                  ) : (
                    <ToggleLeft size={32} className="text-slate-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
