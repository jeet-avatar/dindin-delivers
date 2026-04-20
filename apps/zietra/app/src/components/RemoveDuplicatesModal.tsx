import { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  createdAt: string;
}

interface DuplicateGroup {
  type: string;
  field: string;
  keep: string;
  duplicates: string[];
  contacts: Contact[];
}

interface RemoveDuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function RemoveDuplicatesModal({ isOpen, onClose, onComplete }: RemoveDuplicatesModalProps) {
  const [currentStep, setCurrentStep] = useState(1); // 1: Detecting, 2: Review, 3: Removing, 4: Complete
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(new Set());
  const [totalDuplicates, setTotalDuplicates] = useState(0);
  const [removedCount, setRemovedCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      detectDuplicates();
    }
  }, [isOpen]);

  const detectDuplicates = async () => {
    try {
      setCurrentStep(1);
      setError('');

      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/contacts/detect-duplicates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to detect duplicates');
      }

      const data = await response.json();
      setDuplicateGroups(data.groups);
      setTotalDuplicates(data.totalDuplicates);

      // Pre-select all duplicates (not the ones to keep)
      const allDuplicateIds = new Set<string>();
      data.groups.forEach((group: DuplicateGroup) => {
        group.duplicates.forEach(id => allDuplicateIds.add(id));
      });
      setSelectedDuplicates(allDuplicateIds);

      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to detect duplicates');
      setCurrentStep(2);
    }
  };

  const removeDuplicates = async () => {
    try {
      setCurrentStep(3);
      setError('');

      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/contacts/remove-duplicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          duplicateIds: Array.from(selectedDuplicates),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove duplicates');
      }

      const data = await response.json();
      setRemovedCount(data.removedCount);
      setCurrentStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to remove duplicates');
      setCurrentStep(2);
    }
  };

  const toggleDuplicate = (id: string) => {
    const newSelected = new Set(selectedDuplicates);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDuplicates(newSelected);
  };

  const handleClose = () => {
    setCurrentStep(1);
    setDuplicateGroups([]);
    setSelectedDuplicates(new Set());
    setTotalDuplicates(0);
    setRemovedCount(0);
    setError('');
    onClose();
  };

  const handleComplete = () => {
    handleClose();
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" style={{ paddingLeft: '272px', paddingTop: '16px', paddingRight: '16px', paddingBottom: '16px' }}>
      <div className="bg-[#161625] rounded-2xl shadow-2xl border border-[#2a2a44] max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 relative rounded-t-2xl">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6" />
            Remove Duplicate Contacts
          </h2>
          <p className="text-indigo-100 mt-1 text-sm">
            Find and remove duplicate contacts from your database
          </p>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 bg-[#12121f] border-b border-[#2a2a44]">
          <div className="flex items-center gap-2">
            {[{ n: 1, l: 'Detect' }, { n: 2, l: 'Review' }, { n: 3, l: 'Remove' }, { n: 4, l: 'Done' }].map((s, i) => (
              <div key={s.n} className="flex items-center">
                {i > 0 && <div className={`w-8 h-0.5 ${currentStep >= s.n ? 'bg-indigo-500' : 'bg-[#2a2a44]'}`} />}
                <div className={`flex items-center gap-1.5 ${currentStep >= s.n ? 'text-indigo-400' : 'text-[#64748B]'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= s.n ? 'bg-indigo-500 text-white' : 'bg-[#252540] text-[#64748B]'}`}>
                    {s.n === 4 && currentStep >= 4 ? '✓' : s.n}
                  </div>
                  <span className="text-xs font-medium">{s.l}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Step 1: Detecting */}
          {currentStep === 1 && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-6"></div>
              <h3 className="text-2xl font-semibold text-[#F1F5F9] mb-2">Scanning for Duplicates</h3>
              <p className="text-[#94A3B8]">Please wait while we analyze your contacts...</p>
            </div>
          )}

          {/* Step 2: Review Duplicates */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border-l-4 border-red-500 text-red-400 px-6 py-4 rounded-r-lg">
                  {error}
                </div>
              )}

              {duplicateGroups.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-[#F1F5F9] mb-2">No Duplicates Found!</h3>
                  <p className="text-[#94A3B8]">Your contact list is clean.</p>
                </div>
              ) : (
                <>
                  <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-3 rounded-lg">
                    <p className="font-semibold text-amber-400 text-sm">
                      Found {totalDuplicates} duplicate{totalDuplicates !== 1 ? 's' : ''} in {duplicateGroups.length} group{duplicateGroups.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-[#94A3B8] mt-1">
                      The oldest contact in each group will be kept (green). Check the ones to remove.
                    </p>
                  </div>

                  {duplicateGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="border border-[#2a2a44] rounded-lg overflow-hidden">
                      <div className="bg-[#1c1c30] px-4 py-3 border-b border-[#2a2a44]">
                        <h4 className="font-semibold text-[#F1F5F9]">
                          Duplicate Group #{groupIndex + 1}
                          <span className="ml-2 text-sm font-normal text-[#94A3B8]">
                            ({group.type === 'email' ? 'Same Email' : group.type === 'phone' ? 'Same Phone' : 'Same Name & Company'}: {group.field})
                          </span>
                        </h4>
                      </div>
                      <div className="divide-y divide-[#2a2a44]">
                        {group.contacts.map((contact) => {
                          const isKeeping = contact.id === group.keep;
                          const isSelected = selectedDuplicates.has(contact.id);
                          return (
                            <div
                              key={contact.id}
                              className={`px-4 py-3 flex items-center justify-between ${
                                isKeeping ? 'bg-green-500/10' : 'bg-[#161625]'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <p className="font-medium text-[#F1F5F9]">
                                      {contact.firstName} {contact.lastName}
                                      {isKeeping && (
                                        <span className="ml-2 px-2 py-0.5 bg-green-200 text-green-400 text-xs font-semibold rounded">
                                          KEEP
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-[#94A3B8] mt-1">
                                      {contact.email && <span>{contact.email}</span>}
                                      {contact.phone && <span>{contact.phone}</span>}
                                      {contact.company && <span>{contact.company}</span>}
                                      <span className="text-xs text-[#94A3B8]">
                                        Added: {new Date(contact.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {!isKeeping && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleDuplicate(contact.id)}
                                    className="w-5 h-5 text-red-600 rounded border-[#33335a] focus:ring-red-500"
                                  />
                                  <span className="text-sm text-[#CBD5E1]">Remove</span>
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Step 3: Removing */}
          {currentStep === 3 && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-6"></div>
              <h3 className="text-2xl font-semibold text-[#F1F5F9] mb-2">Removing Duplicates</h3>
              <p className="text-[#94A3B8]">Please wait...</p>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center py-12">
              <CheckCircleIcon className="w-20 h-20 text-green-600 mx-auto mb-6" />
              <h3 className="text-3xl font-bold text-[#F1F5F9] mb-3">Successfully Removed!</h3>
              <p className="text-xl text-[#CBD5E1] mb-2">
                {removedCount} duplicate contact{removedCount !== 1 ? 's' : ''} removed
              </p>
              <p className="text-[#94A3B8]">Your contact list has been cleaned up.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#12121f] border-t border-[#2a2a44] flex justify-between items-center">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 border border-[#3d3d5c] rounded-lg font-medium text-[#94A3B8] hover:bg-[#1e1e36] hover:text-[#F1F5F9] transition-colors text-sm"
          >
            {currentStep === 4 ? 'Close' : 'Cancel'}
          </button>

          {currentStep === 2 && duplicateGroups.length > 0 && (
            <button
              onClick={removeDuplicates}
              disabled={selectedDuplicates.size === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg font-semibold text-sm hover:from-red-700 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <TrashIcon className="w-4 h-4" />
              Remove {selectedDuplicates.size} Duplicate{selectedDuplicates.size !== 1 ? 's' : ''}
            </button>
          )}

          {currentStep === 4 && (
            <button
              onClick={handleComplete}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold text-sm transition-all"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
