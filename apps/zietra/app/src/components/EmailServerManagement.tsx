import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';

interface EmailServer {
  id: string;
  name: string;
  provider: string;
  fromEmail: string;
  fromName: string | null;
  host: string;
  port: number;
  isVerified: boolean;
  isActive: boolean;
  lastTested: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEmailVerified?: () => void;
}

export function EmailServerManagement({ isOpen, onClose, onEmailVerified }: Props) {
  const [servers, setServers] = useState<EmailServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    provider: 'gmail',
    host: 'smtp.gmail.com',
    port: '587',
    secure: true,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadServers();
    }
  }, [isOpen]);

  const loadServers = async () => {
    try {
      setLoading(true);
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/email-servers?userId=demo-user');
      const data = await response.json();
      setServers(data.servers || []);
    } catch (err) {
      console.error('Error loading servers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    const configs: Record<string, { host: string; port: string; secure: boolean }> = {
      gmail: { host: 'smtp.gmail.com', port: '587', secure: true },
      outlook: { host: 'smtp-mail.outlook.com', port: '587', secure: true },
      sendgrid: { host: 'smtp.sendgrid.net', port: '587', secure: true },
      custom: { host: '', port: '587', secure: true },
    };

    const config = configs[provider] || configs.custom;
    setFormData({ ...formData, provider, ...config });
  };

  const handleAddServer = async () => {
    try {
      setError('');
      setLoading(true);

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/email-servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId: 'demo-user',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Email server added! Now test the connection.');
        await loadServers();
        setShowAddForm(false);
        // Reset form
        setFormData({
          name: '',
          provider: 'gmail',
          host: 'smtp.gmail.com',
          port: '587',
          secure: true,
          username: '',
          password: '',
          fromEmail: '',
          fromName: '',
        });
      } else {
        setError(data.error || 'Failed to add email server');
      }
    } catch (err) {
      setError('Failed to add email server');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (serverId: string) => {
    try {
      setError('');
      setLoading(true);

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/email-servers/${serverId}/test`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('SMTP connection successful! ✓');
        await loadServers();
      } else {
        setError(`Connection failed: ${data.details}`);
      }
    } catch (err) {
      setError('Failed to test connection');
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async (serverId: string) => {
    try {
      setError('');
      setLoading(true);

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/email-servers/${serverId}/send-verification`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Verification code sent! Check your email inbox.');
        setVerifyingId(serverId);
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (err) {
      setError('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verifyingId) return;

    try {
      setError('');
      setLoading(true);

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/email-servers/${verifyingId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Email verified successfully! ✓');
        setVerifyingId(null);
        setVerificationCode('');
        await loadServers();
        if (onEmailVerified) onEmailVerified();
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const deleteServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this email configuration?')) return;

    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/email-servers/${serverId}`, {
        method: 'DELETE',
      });
      await loadServers();
      setSuccess('Email server deleted');
    } catch (err) {
      setError('Failed to delete server');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-[#161625] rounded-2xl shadow-2xl border-4 border-[#33335a] max-w-4xl w-full my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Email Server Management</h2>
              <p className="text-indigo-200 text-lg">Configure and verify your sending emails</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#161625] hover:bg-opacity-20 rounded-lg transition-all"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-6 bg-red-500/10 border-2 border-red-200 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
            <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-6 bg-green-500/10 border-2 border-green-200 text-green-400 px-4 py-3 rounded-xl flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add New Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 px-6 py-4 border-2 border-dashed border-orange-300 rounded-xl text-indigo-400 font-semibold hover:bg-orange-500/10 hover:border-orange-400 transition-all flex items-center justify-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add New Email Server
            </button>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="mb-6 bg-orange-500/10 border-2 border-orange-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-[#F1F5F9] mb-4">Add Email Configuration</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">Configuration Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., My Gmail Account"
                    className="w-full px-4 py-3 border-2 border-[#33335a] rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">Provider *</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#33335a] rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  >
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook/Office365</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="custom">Custom SMTP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">SMTP Host *</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-3 border-2 border-[#33335a] rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">Port *</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-[#33335a] rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">Username/Email *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border-2 border-[#33335a] rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">Password/API Key *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border-2 border-[#33335a] rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">From Email *</label>
                  <input
                    type="email"
                    value={formData.fromEmail}
                    onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                    placeholder="sender@company.com"
                    className="w-full px-4 py-3 border-2 border-[#33335a] rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">From Name</label>
                  <input
                    type="text"
                    value={formData.fromName}
                    onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                    placeholder="Your Company"
                    className="w-full px-4 py-3 border-2 border-[#33335a] rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddServer}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Adding...' : 'Add Server'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 border-2 border-[#33335a] text-[#CBD5E1] rounded-lg font-semibold hover:bg-[#12121f] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Server List */}
          <div className="space-y-4">
            {servers.map((server) => (
              <div
                key={server.id}
                className={`border-2 rounded-xl p-6 transition-all ${
                  server.isVerified ? 'border-green-200 bg-green-500/10' : 'border-[#2a2a44] bg-[#161625]'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <ServerIcon className="h-6 w-6 text-indigo-400" />
                      <h3 className="text-xl font-bold text-[#F1F5F9]">{server.name}</h3>
                      {server.isVerified ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/15 text-green-400 text-xs font-semibold rounded-full">
                          <CheckCircleIcon className="h-4 w-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/15 text-yellow-400 text-xs font-semibold rounded-full">
                          <ExclamationCircleIcon className="h-4 w-4" />
                          Unverified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-[#94A3B8] mb-3">
                      <div className="flex items-center gap-1">
                        <EnvelopeIcon className="h-4 w-4" />
                        <span className="font-medium">{server.fromEmail}</span>
                      </div>
                      <span>•</span>
                      <span>{server.provider}</span>
                      <span>•</span>
                      <span>{server.host}:{server.port}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteServer(server.id)}
                    className="p-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => testConnection(server.id)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 border-2 border-orange-300 text-orange-400 rounded-lg font-semibold hover:bg-orange-500/10 disabled:opacity-50 transition-all"
                  >
                    <ShieldCheckIcon className="h-4 w-4" />
                    Test Connection
                  </button>

                  {!server.isVerified && (
                    <button
                      onClick={() => sendVerificationCode(server.id)}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all"
                    >
                      <EnvelopeIcon className="h-4 w-4" />
                      Send Verification Code
                    </button>
                  )}
                </div>

                {/* Verification Code Input */}
                {verifyingId === server.id && (
                  <div className="mt-4 bg-[#161625] border-2 border-rose-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                      Enter 6-digit verification code sent to {server.fromEmail}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className="flex-1 px-4 py-3 border-2 border-[#33335a] rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none text-2xl font-bold text-center tracking-widest"
                      />
                      <button
                        onClick={verifyCode}
                        disabled={loading || verificationCode.length !== 6}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all"
                      >
                        Verify
                      </button>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-2">Code expires in 15 minutes</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {servers.length === 0 && !showAddForm && (
            <div className="text-center py-12">
              <ServerIcon className="h-16 w-16 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#F1F5F9] mb-2">No email servers configured</h3>
              <p className="text-[#94A3B8] mb-6">Add your first email configuration to start sending campaigns</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-[#2a2a44] p-6 bg-[#12121f] flex justify-between items-center flex-shrink-0">
          <p className="text-sm text-[#94A3B8]">
            {servers.filter(s => s.isVerified).length} of {servers.length} email(s) verified
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailServerManagement;
