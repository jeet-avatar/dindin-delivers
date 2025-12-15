import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { CoupaTransaction } from '../../constants/types';
import { ModalOverlay } from '../ui/ModalOverlay';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: CoupaTransaction | null;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  const [formData, setFormData] = useState({
    type: '',
    number: '',
    vendor: '',
    subsidiary: '',
    location: '',
    date: '',
    dueDate: '',
    amount: 0,
    status: ''
  });

  const toNumber = (value: string): number => {
    if (!value) return 0;
    return Number.parseFloat(value.split(',').join('')) || 0;
  };

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction["Type"],
        number: transaction["Number"],
        vendor: transaction["Vendor"] || '',
        subsidiary: transaction["Subsidiary"] || '',
        location: transaction["Location"] || '',
        date: transaction["Date"],
        dueDate: transaction["Due Date"] || '',
        amount: toNumber(transaction["Amount"]),
        status: transaction["Status"]
      });
    }
  }, [transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Updated Transaction Data:', formData);
    onClose();
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900">View Transaction</h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="transactionNumber" className="block text-sm font-medium text-neutral-700 mb-1">
                    Transaction Number
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                    value={formData.number}
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label htmlFor="transactionType" className="block text-sm font-medium text-neutral-700 mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                    value={formData.type.replace('_', ' ')}
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label htmlFor="transactionDate" className="block text-sm font-medium text-neutral-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                    value={formData.date}
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label htmlFor="transactionDueDate" className="block text-sm font-medium text-neutral-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                    value={formData.dueDate}
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label htmlFor="transactionAmount" className="block text-sm font-medium text-neutral-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                    value={formData.amount}
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label htmlFor="transactionStatus" className="block text-sm font-medium text-neutral-700 mb-1">
                    Status
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                    value={formData.status.replace('_', ' ')}
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label htmlFor="transactionVendor" className="block text-sm font-medium text-neutral-700 mb-1">
                    Vendor
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                    value={formData.vendor}
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label htmlFor="transactionSubsidiary" className="block text-sm font-medium text-neutral-700 mb-1">
                    Subsidiary
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                    value={formData.subsidiary}
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label htmlFor="transactionLocation" className="block text-sm font-medium text-neutral-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                    value={formData.location}
                    disabled
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="outline" type="button" onClick={onClose}>
                Close
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;