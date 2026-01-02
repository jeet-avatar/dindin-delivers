import React, { useState } from 'react';
import { X, Check, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import { ModalOverlay } from '../ui/ModalOverlay';

interface TransactionLineItem {
  totalPrice?: number;
  [key: string]: unknown;
}

interface Transaction {
  amount?: number;
  lineItems?: TransactionLineItem[];
  [key: string]: unknown;
}

interface CoupaApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onApprove: (transaction: Transaction, comments: string) => void;
}

const CoupaApprovalModal: React.FC<CoupaApprovalModalProps> = ({ 
  isOpen, 
  onClose, 
  transaction,
  onApprove 
}) => {
  const [approvalComments, setApprovalComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate Coupa approval process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onApprove(transaction, approvalComments);
      onClose();
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !transaction) return null;

  const totalAmount = transaction.lineItems?.reduce((sum: number, item: TransactionLineItem) => sum + (item.totalPrice || 0), 0) || transaction.amount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900">Approve Coupa Requisition</h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {/* Transaction Summary */}
            <div className="bg-neutral-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-neutral-900 mb-3">Requisition Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-600">Coupa ID</p>
                  <p className="font-medium text-neutral-900">{transaction.coupaId}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600">Supplier</p>
                  <p className="font-medium text-neutral-900">{transaction.supplier}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600">Department</p>
                  <p className="font-medium text-neutral-900">{transaction.department}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600">Total Amount</p>
                  <p className="font-medium text-neutral-900">${totalAmount.toLocaleString()}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-neutral-600">Business Justification</p>
                  <p className="font-medium text-neutral-900">{transaction.businessJustification}</p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <h3 className="font-medium text-neutral-900 mb-3">Line Items</h3>
              <div className="space-y-2">
                {transaction.lineItems?.map((item: any, index: number) => {
                  const key = `${index}`;
                  return (
                    <div key={key} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{item.description}</p>
                        <p className="text-xs text-neutral-500">
                          Qty: {item.quantity} × ${item.unitPrice} = ${item.totalPrice?.toLocaleString()}
                        </p>
                      </div>
                      <span className="text-sm text-neutral-600">{item.category}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Approval Workflow Status */}
            <div className="mb-6">
              <h3 className="font-medium text-neutral-900 mb-3">Approval Workflow</h3>
              <div className="space-y-3">
                {transaction.approvalWorkflow?.map((approval: any, index: number) => {
                  const key = `${index}`;
                  return (
                    <div key={key} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      {(() => {
                        let statusIcon;
                        if (approval.status === 'approved') {
                          statusIcon = <CheckCircle className="h-5 w-5 text-success-500" />;
                        } else if (approval.status === 'pending') {
                          statusIcon = <Clock className="h-5 w-5 text-warning-500" />;
                        } else {
                          statusIcon = <AlertCircle className="h-5 w-5 text-error-500" />;
                        }

                        let statusClass = '';
                        if (approval.status === 'approved') {
                          statusClass = 'bg-success-100 text-success-700';
                        } else if (approval.status === 'pending') {
                          statusClass = 'bg-warning-100 text-warning-700';
                        } else {
                          statusClass = 'bg-error-100 text-error-700';
                        }

                        return (
                          <>
                            <div className="flex items-center space-x-3">
                              {statusIcon}
                              <div>
                                <p className="text-sm font-medium text-neutral-900">Step {approval.step}</p>
                                <p className="text-xs text-neutral-500">{approval.approver}</p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                              {approval.status}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Approval Comments */}
            <div className="mb-6">
              <label htmlFor="approvalComments" className="block text-sm font-medium text-neutral-700 mb-2">
                Approval Comments
              </label>
              <textarea
                rows={4}
                className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                value={approvalComments}
                onChange={e => setApprovalComments(e.target.value)}
                placeholder="Add comments for this approval (optional)"
              />
            </div>

            {/* Approval Actions */}
            <div className="bg-success-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Check className="h-5 w-5 text-success-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-success-800">Approve Requisition</p>
                  <p className="text-sm text-success-700 mt-1">
                    This will approve the requisition in Coupa and move it to the next step in the workflow.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                className="text-error-600 border-error-600 hover:bg-error-50"
              >
                Reject
              </Button>
              <Button 
                variant="primary" 
                onClick={handleApprove}
                isLoading={isProcessing}
                leftIcon={<Check size={16} />}
              >
                {isProcessing ? 'Processing...' : 'Approve in Coupa'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoupaApprovalModal;