import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { ModalOverlay } from '../ui/ModalOverlay';

interface CreateJiraTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateJiraTicketModal: React.FC<CreateJiraTicketModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee: '',
    system: 'coupa',
    type: 'bug'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('JIRA Ticket Data:', formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900">Create JIRA Ticket</h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-neutral-700 mb-1">
                    Priority *
                  </label>
                  <select
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.priority}
                    onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="assignee" className="block text-sm font-medium text-neutral-700 mb-1">
                    Assignee
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.assignee}
                    onChange={e => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                  />
                </div>

                <div>
                  <label htmlFor="system" className="block text-sm font-medium text-neutral-700 mb-1">
                    System *
                  </label>
                  <select
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.system}
                    onChange={e => setFormData(prev => ({ ...prev, system: e.target.value }))}
                  >
                    <option value="coupa">Coupa</option>
                    <option value="netsuite">NetSuite</option>
                    <option value="zip">ZIP</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-neutral-700 mb-1">
                    Type *
                  </label>
                  <select
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="bug">Bug</option>
                    <option value="task">Task</option>
                    <option value="feature">Feature Request</option>
                    <option value="improvement">Improvement</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create Ticket
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateJiraTicketModal;