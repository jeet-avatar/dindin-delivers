import { useState, useEffect } from 'react';
import { UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import apiClient from '../services/api';

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  teamRole: 'OWNER' | 'MEMBER';
  inviteAccepted: boolean;
}

interface AssignmentDropdownProps {
  resourceType: 'contact' | 'company';
  resourceId: string;
  currentAssignedToId: string | null;
  currentAssignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  onAssignmentChange?: () => void;
  compact?: boolean;
}

export function AssignmentDropdown({
  resourceType,
  resourceId,
  currentAssignedToId,
  currentAssignedTo,
  onAssignmentChange,
  compact = false,
}: AssignmentDropdownProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/team');
      const members = response.data.teamMembers || [];
      // Show all team members (including those who haven't accepted invites yet)
      // They are still valid team members and can be assigned work
      setTeamMembers(members);
    } catch (err: any) {
      console.error('Failed to fetch team members:', err);
      // Silently fail - user might not have team members yet
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (userId: string) => {
    if (userId === currentAssignedToId) return; // Already assigned to this user

    setAssigning(true);
    setError('');
    setSuccess('');

    try {
      if (userId === '') {
        // Unassign
        await apiClient.post(`/${resourceType}s/${resourceId}/unassign`);
        setSuccess(`${resourceType === 'contact' ? 'Contact' : 'Company'} unassigned successfully`);
      } else {
        // Assign
        await apiClient.post(`/${resourceType}s/${resourceId}/assign`, {
          assignToUserId: userId,
        });
        const member = teamMembers.find(m => m.id === userId);
        setSuccess(`Assigned to ${member?.firstName} ${member?.lastName}`);
      }

      // Notify parent component
      if (onAssignmentChange) {
        onAssignmentChange();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update assignment');
      setTimeout(() => setError(''), 5000);
    } finally {
      setAssigning(false);
    }
  };

  if (compact) {
    // Compact view for list pages
    return (
      <div className="flex items-center gap-2">
        <select
          value={currentAssignedToId || ''}
          onChange={(e) => handleAssign(e.target.value)}
          disabled={assigning || loading}
          className="text-sm rounded-md border-[#33335a] shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-[#1c1c30] disabled:cursor-not-allowed"
          onClick={(e) => e.stopPropagation()} // Prevent row click when clicking dropdown
        >
          <option value="">Unassigned</option>
          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.firstName} {member.lastName}{!member.inviteAccepted ? ' (Pending)' : ''}
            </option>
          ))}
        </select>
        {assigning && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
        )}
      </div>
    );
  }

  // Full view for detail pages
  return (
    <div className="bg-[#161625] shadow rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserIcon className="h-5 w-5 text-[#64748B]" />
        <h3 className="text-lg font-medium text-[#F1F5F9]">Team Assignment</h3>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-200 rounded-md text-sm text-green-600 flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
            Assigned To
          </label>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              Loading team members...
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-sm text-[#94A3B8] bg-[#12121f] p-3 rounded-md">
              No team members available. <a href="/team" className="text-indigo-400 hover:text-orange-400">Invite team members</a> to enable assignment.
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <select
                value={currentAssignedToId || ''}
                onChange={(e) => handleAssign(e.target.value)}
                disabled={assigning}
                className="flex-1 block rounded-md border-[#33335a] shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-[#1c1c30] disabled:cursor-not-allowed"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName} ({member.teamRole}){!member.inviteAccepted ? ' - Pending Invite' : ''}
                  </option>
                ))}
              </select>

              {currentAssignedToId && (
                <button
                  onClick={() => handleAssign('')}
                  disabled={assigning}
                  className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-400 bg-[#161625] hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove assignment"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}

              {assigning && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
              )}
            </div>
          )}
        </div>

        {currentAssignedTo && (
          <div className="bg-orange-500/10 border border-orange-200 rounded-md p-3">
            <div className="flex items-center gap-2 text-sm text-orange-400">
              <UserIcon className="h-4 w-4" />
              <span>
                Currently assigned to: <strong>{currentAssignedTo.firstName} {currentAssignedTo.lastName}</strong>
              </span>
            </div>
          </div>
        )}

        <div className="text-xs text-[#94A3B8] bg-[#12121f] p-3 rounded-md">
          <p className="font-medium mb-1">How assignment works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Assigned team members can view and work on this {resourceType}</li>
            <li>Team members see only their assigned items in filtered views</li>
            <li>Account owners can see all items regardless of assignment</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
