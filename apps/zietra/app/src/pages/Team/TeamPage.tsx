import { useState, useEffect } from 'react';
import { UserPlusIcon, TrashIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import apiClient from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  teamRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  inviteAccepted: boolean;
  invitedAt: string;
  acceptedAt?: string;
}

export function TeamPage() {
  const { gradients } = useTheme();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
  });
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteToken, setInviteToken] = useState('');

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/team');
      setTeamMembers(response.data.teamMembers || []);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Only account owners can view team members');
      } else {
        setError('Failed to load team members');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    setInviteSuccess('');

    try {
      const response = await apiClient.post('/team/invite', inviteData);
      setInviteSuccess(`✅ Invitation sent to ${inviteData.email}!`);
      setInviteToken(response.data.inviteToken);
      setInviteData({ email: '', firstName: '', lastName: '' });

      // Refresh team list
      await fetchTeamMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from your team?`)) {
      return;
    }

    try {
      await apiClient.delete(`/team/${memberId}`);
      setTeamMembers(teamMembers.filter(m => m.id !== memberId));
      setInviteSuccess(`✅ Removed ${memberName} from team`);
      setTimeout(() => setInviteSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove team member');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'MEMBER' | 'ADMIN', memberName: string) => {
    try {
      await apiClient.put(`/team/${memberId}/role`, { teamRole: newRole });
      setTeamMembers(teamMembers.map(m =>
        m.id === memberId ? { ...m, teamRole: newRole } : m
      ));
      setInviteSuccess(`✅ Updated ${memberName}'s role to ${newRole}`);
      setTimeout(() => setInviteSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#F1F5F9]">Team Members</h1>
            <p className="mt-2 text-[#94A3B8]">
              Manage your team and invite new members to collaborate
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className={`inline-flex items-center px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all shadow-lg tracking-wide`}
          >
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Invite Team Member
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-200 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {inviteSuccess && (
        <div className="mb-6 bg-green-500/10 border border-green-200 rounded-lg p-4">
          <p className="text-green-400">{inviteSuccess}</p>
          {inviteToken && (
            <div className="mt-3 p-3 bg-[#161625] border border-green-300 rounded">
              <p className="text-sm font-semibold text-[#CBD5E1] mb-1">Invitation Token:</p>
              <code className="text-xs text-[#94A3B8] break-all">{inviteToken}</code>
              <p className="text-xs text-[#94A3B8] mt-2">
                📧 In production, this would be sent via email. For now, share this token with the new member.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-[#161625] shadow rounded-lg overflow-hidden">
        {teamMembers.length === 0 ? (
          <div className="text-center py-12">
            <UserPlusIcon className="mx-auto h-12 w-12 text-[#64748B]" />
            <h3 className="mt-2 text-sm font-medium text-[#F1F5F9]">No team members yet</h3>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Get started by inviting your first team member
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#2a2a44]">
              <thead className="bg-[#12121f]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                    Invited
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#161625] divide-y divide-[#2a2a44]">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-[#12121f]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#F1F5F9]">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        {member.teamRole === 'OWNER' ? (
                          <span className="font-semibold text-indigo-400">OWNER</span>
                        ) : (
                          <select
                            value={member.teamRole}
                            onChange={(e) => handleRoleChange(member.id, e.target.value as 'MEMBER' | 'ADMIN', `${member.firstName} ${member.lastName}`)}
                            className="text-xs border border-[#33335a] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="MEMBER">MEMBER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[#F1F5F9]">{member.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.inviteAccepted ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                      {new Date(member.invitedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveMember(member.id, `${member.firstName} ${member.lastName}`)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                      >
                        <TrashIcon className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-[#161625] rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-[#2a2a44]">
              <h3 className="text-lg font-semibold text-[#F1F5F9]">Invite Team Member</h3>
            </div>

            <form onSubmit={handleInvite} className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#33335a] rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="member@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteData.firstName}
                    onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-[#33335a] rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteData.lastName}
                    onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-[#33335a] rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteData({ email: '', firstName: '', lastName: '' });
                    setError('');
                  }}
                  className="px-4 py-2 border border-[#33335a] rounded-md text-[#CBD5E1] hover:bg-[#12121f] transition-colors"
                  disabled={inviting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className={`px-4 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center font-bold tracking-wide shadow-md`}
                >
                  {inviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
