import { useState, useEffect } from 'react';
import { XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import apiClient from '../services/api';

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  teamRole: 'OWNER' | 'MEMBER';
  inviteAccepted: boolean;
}

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'contact' | 'company';
  selectedIds: string[];
  onSuccess?: () => void;
}

export function BulkAssignModal({
  isOpen,
  onClose,
  resourceType,
  selectedIds,
  onSuccess,
}: BulkAssignModalProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
      setSelectedMemberId('');
      setError('');
    }
  }, [isOpen]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/team');
      const members = response.data.teamMembers || [];
      // Show all team members (including those who haven't accepted invites yet)
      setTeamMembers(members);
    } catch (err: any) {
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedMemberId) {
      setError('Please select a team member');
      return;
    }

    setAssigning(true);
    setError('');

    try {
      await apiClient.post(`/${resourceType}s/bulk-assign`, {
        [`${resourceType}Ids`]: selectedIds,
        assignToUserId: selectedMemberId,
      });

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        `Failed to assign ${resourceType}s`
      );
    } finally {
      setAssigning(false);
    }
  };

  if (!isOpen) return null;

  const resourceLabel = resourceType === 'contact' ? 'Contact' : 'Company';
  const resourcesLabel = resourceType === 'contact' ? 'Contacts' : 'Companies';
  const selectedMember = teamMembers.find(m => m.id === selectedMemberId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-[#161625] rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="h-6 w-6 text-indigo-400" />
              <h3 className="text-lg font-medium text-[#F1F5F9]">
                Bulk Assign {resourcesLabel}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#94A3B8]"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-orange-500/10 border border-orange-200 rounded-md p-3">
              <p className="text-sm text-orange-400">
                You're about to assign <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? resourceLabel.toLowerCase() : resourcesLabel.toLowerCase()} to a team member.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Team Member Selection */}
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                Assign to Team Member
              </label>

              {loading ? (
                <div className="flex items-center gap-2 text-sm text-[#94A3B8] py-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  Loading team members...
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-sm text-[#94A3B8] bg-[#12121f] p-3 rounded-md border border-[#2a2a44]">
                  <p className="mb-2">No team members available.</p>
                  <a
                    href="/team"
                    className="text-indigo-400 hover:text-orange-400 font-medium"
                  >
                    Invite team members →
                  </a>
                </div>
              ) : (
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  disabled={assigning}
                  className="w-full block rounded-md border-[#33335a] shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-[#1c1c30] disabled:cursor-not-allowed"
                >
                  <option value="">Select team member...</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName} ({member.email}){!member.inviteAccepted ? ' - Pending Invite' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Preview */}
            {selectedMember && (
              <div className="bg-green-500/10 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-400">
                  <strong>{selectedMember.firstName} {selectedMember.lastName}</strong> will be assigned {selectedIds.length} {selectedIds.length === 1 ? resourceLabel.toLowerCase() : resourcesLabel.toLowerCase()}.
                </p>
              </div>
            )}

            {/* Info */}
            <div className="text-xs text-[#94A3B8] bg-[#12121f] p-3 rounded-md border border-[#2a2a44]">
              <p className="font-medium mb-1">What happens next:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Selected {resourcesLabel.toLowerCase()} will be assigned to the chosen team member</li>
                <li>The team member can view these items in their "Assigned to Me" view</li>
                <li>You can reassign or unassign items at any time</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={assigning}
              className="flex-1 px-4 py-2 border border-[#33335a] rounded-md shadow-sm text-sm font-medium text-[#CBD5E1] bg-[#161625] hover:bg-[#12121f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={assigning || !selectedMemberId || loading || teamMembers.length === 0}
              className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {assigning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Assigning...
                </>
              ) : (
                `Assign ${resourcesLabel}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
