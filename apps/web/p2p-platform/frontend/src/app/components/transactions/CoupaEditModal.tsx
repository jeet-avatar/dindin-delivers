import React, { useState, useEffect } from 'react';
import { X, Save, FileText, User, Building, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import EditableField from '../ui/EditableField';
import { ModalOverlay } from '../ui/ModalOverlay';

interface CoupaEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onSave: (transaction: any) => void;
}

const CoupaEditModal: React.FC<CoupaEditModalProps> = ({ 
  isOpen, 
  onClose, 
  transaction,
  onSave 
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [editedTransaction, setEditedTransaction] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setEditedTransaction({ ...transaction });
      setHasChanges(false);
    }
  }, [transaction]);

  const tabs = [
    { id: 'details', label: 'Requisition Details', icon: FileText },
    { id: 'items', label: 'Line Items', icon: Building },
    { id: 'approval', label: 'Approval Workflow', icon: User },
    { id: 'status', label: 'Status & Tracking', icon: Clock }
  ];

  const handleFieldUpdate = (field: string, value: string | number) => {
    if (!editedTransaction) return;

    setEditedTransaction((prev: any) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleLineItemUpdate = (index: number, field: string, value: string | number) => {
    if (!editedTransaction) return;

    const newLineItems = [...editedTransaction.lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      newLineItems[index].totalPrice = Number(newLineItems[index].quantity) * Number(newLineItems[index].unitPrice);
    }

    setEditedTransaction((prev: any) => ({ 
      ...prev, 
      lineItems: newLineItems,
      amount: newLineItems.reduce((sum, item) => sum + item.totalPrice, 0)
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!editedTransaction) return;

    setIsSaving(true);
    
    try {
      // Simulate API call to update Coupa
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Syncing transaction updates to Coupa system');
      
      onSave(editedTransaction);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save transaction:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderDetailsTab = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Requisition Information</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="coupaId" className="block text-sm font-medium text-neutral-700 mb-2">
            Coupa ID
          </label>
          <EditableField
            value={editedTransaction?.coupaId || ''}
            onSave={(value) => handleFieldUpdate('coupaId', value)}
            disabled
          />
        </div>

        <div>
          <label htmlFor="poNumber" className="block text-sm font-medium text-neutral-700 mb-2">
            PO Number
          </label>
          <EditableField
            value={editedTransaction?.number || ''}
            onSave={(value) => handleFieldUpdate('number', value)}
            placeholder="PO Number"
          />
        </div>

        <div>
          <label htmlFor="supplier" className="block text-sm font-medium text-neutral-700 mb-2">
            Supplier
          </label>
          <EditableField
            value={editedTransaction?.supplier || ''}
            onSave={(value) => handleFieldUpdate('supplier', value)}
            type="select"
            options={[
              { value: 'Office Solutions Inc.', label: 'Office Solutions Inc.' },
              { value: 'Tech Hardware Pro', label: 'Tech Hardware Pro' },
              { value: 'Creative Solutions Ltd.', label: 'Creative Solutions Ltd.' },
              { value: 'Global Services Corp', label: 'Global Services Corp' }
            ]}
          />
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium text-neutral-700 mb-2">
            Department
          </label>
          <EditableField
            value={editedTransaction?.department || ''}
            onSave={(value) => handleFieldUpdate('department', value)}
            type="select"
            options={[
              { value: 'IT', label: 'IT' },
              { value: 'Marketing', label: 'Marketing' },
              { value: 'Operations', label: 'Operations' },
              { value: 'Finance', label: 'Finance' },
              { value: 'HR', label: 'HR' }
            ]}
          />
        </div>

        <div>
          <label htmlFor="costCenter" className="block text-sm font-medium text-neutral-700 mb-2">
            Cost Center
          </label>
          <EditableField
            value={editedTransaction?.costCenter || ''}
            onSave={(value) => handleFieldUpdate('costCenter', value)}
            type="select"
            options={[
              { value: 'CC-IT-001', label: 'IT Operations' },
              { value: 'CC-MKT-001', label: 'Marketing' },
              { value: 'CC-OPS-001', label: 'Operations' },
              { value: 'CC-FIN-001', label: 'Finance' }
            ]}
          />
        </div>

        <div>
          <label htmlFor="buyer" className="block text-sm font-medium text-neutral-700 mb-2">
            Buyer
          </label>
          <EditableField
            value={editedTransaction?.buyer || ''}
            onSave={(value) => handleFieldUpdate('buyer', value)}
            placeholder="Buyer name"
          />
        </div>

        <div>
          <label htmlFor="deliveryDate" className="block text-sm font-medium text-neutral-700 mb-2">
            Delivery Date
          </label>
          <EditableField
            value={editedTransaction?.deliveryDate || ''}
            onSave={(value) => handleFieldUpdate('deliveryDate', value)}
            type="date"
          />
        </div>

        <div>
          <label htmlFor="urgencyLevel" className="block text-sm font-medium text-neutral-700 mb-2">
            Urgency Level
          </label>
          <EditableField
            value={editedTransaction?.urgency || ''}
            onSave={(value) => handleFieldUpdate('urgency', value)}
            type="select"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="businessJustification" className="block text-sm font-medium text-neutral-700 mb-2">
            Business Justification
          </label>
          <EditableField
            value={editedTransaction?.businessJustification || ''}
            onSave={(value) => handleFieldUpdate('businessJustification', value)}
            placeholder="Business justification"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
            Description
          </label>
          <EditableField
            value={editedTransaction?.description || ''}
            onSave={(value) => handleFieldUpdate('description', value)}
            placeholder="Transaction description"
          />
        </div>
      </div>
    </div>
  );

  const renderLineItemsTab = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Line Items Management</h4>
      
      {editedTransaction?.lineItems?.map((item: any, index: number) => {
        const key = `${index}`;
        return (
          <div key={key} className="border border-neutral-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-neutral-900">Item {index + 1}</h5>
              <span className="text-sm text-neutral-500">
                Total: ${item.totalPrice?.toLocaleString() || '0'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="itemDescription" className="block text-sm font-medium text-neutral-700 mb-1">
                  Description
                </label>
                <EditableField
                  value={item.description || ''}
                  onSave={(value) => handleLineItemUpdate(index, 'description', value)}
                  placeholder="Item description"
                />
              </div>

              <div>
                <label htmlFor="itemQuantity" className="block text-sm font-medium text-neutral-700 mb-1">
                  Quantity
                </label>
                <EditableField
                  value={item.quantity || 0}
                  onSave={(value) => handleLineItemUpdate(index, 'quantity', value)}
                  type="number"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="itemUnitPrice" className="block text-sm font-medium text-neutral-700 mb-1">
                  Unit Price
                </label>
                <EditableField
                  value={item.unitPrice || 0}
                  onSave={(value) => handleLineItemUpdate(index, 'unitPrice', value)}
                  type="number"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="itemCategory" className="block text-sm font-medium text-neutral-700 mb-1">
                  Category
                </label>
                <EditableField
                  value={item.category || ''}
                  onSave={(value) => handleLineItemUpdate(index, 'category', value)}
                  type="select"
                  options={[
                    { value: 'IT Equipment', label: 'IT Equipment' },
                    { value: 'Office Supplies', label: 'Office Supplies' },
                    { value: 'Professional Services', label: 'Professional Services' },
                    { value: 'Marketing', label: 'Marketing' },
                    { value: 'Facilities', label: 'Facilities' }
                  ]}
                />
              </div>

              <div>
                <label htmlFor="itemAccount" className="block text-sm font-medium text-neutral-700 mb-1">
                  Account
                </label>
                <EditableField
                  value={item.account || ''}
                  onSave={(value) => handleLineItemUpdate(index, 'account', value)}
                  type="select"
                  options={[
                    { value: 'Equipment', label: 'Equipment' },
                    { value: 'Supplies', label: 'Supplies' },
                    { value: 'Services', label: 'Services' },
                    { value: 'Marketing Expense', label: 'Marketing Expense' }
                  ]}
                />
              </div>
            </div>
          </div>
        );  
      })}

      <div className="bg-primary-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary-800">Total Requisition Amount</p>
            <p className="text-2xl font-semibold text-primary-900">
              ${editedTransaction?.lineItems?.reduce((sum: any, item: any) => sum + (item.totalPrice || 0), 0).toLocaleString() || '0'}
            </p>
          </div>
          <FileText className="h-8 w-8 text-primary-600" />
        </div>
      </div>
    </div>
  );

  // Helper function to update approval workflow
  const updateApprovalWorkflow = (index: number, field: string, value: string | number) => {
    if (!editedTransaction) return;
    const newWorkflow = [...editedTransaction.approvalWorkflow];
    newWorkflow[index] = { ...newWorkflow[index], [field]: value };
    setEditedTransaction((prev: any) => ({ ...prev, approvalWorkflow: newWorkflow }));
    setHasChanges(true);
  };

  const renderApprovalTab = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Approval Workflow</h4>
      
      {editedTransaction?.approvalWorkflow?.map((approval: any, index: number) => {
        const key = `${index}`;
        let statusIcon;
        if (approval.status === 'approved') {
          statusIcon = <CheckCircle className="h-6 w-6 text-success-500" />;
        } else if (approval.status === 'rejected') {
          statusIcon = <AlertCircle className="h-6 w-6 text-error-500" />;
        } else {
          statusIcon = <Clock className="h-6 w-6 text-warning-500" />;
        }

        let statusClass = '';
        if (approval.status === 'approved') {
          statusClass = 'bg-success-100 text-success-700';
        } else if (approval.status === 'rejected') {
          statusClass = 'bg-error-100 text-error-700';
        } else {
          statusClass = 'bg-warning-100 text-warning-700';
        }

        return (
          <div key={key} className="border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {statusIcon}
                <div>
                  <h5 className="font-medium text-neutral-900">Step {approval.step}</h5>
                  <p className="text-sm text-neutral-500">{approval.approver}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                {approval.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="approvalApprover" className="block text-sm font-medium text-neutral-700 mb-1">
                  Approver
                </label>
                <EditableField
                  value={approval.approver}
                  onSave={(value) => updateApprovalWorkflow(index, 'approver', value)}
                  type="select"
                  options={[
                    { value: 'John Doe - Manager', label: 'John Doe - Manager' },
                    { value: 'Sarah Johnson - Finance', label: 'Sarah Johnson - Finance' },
                    { value: 'Michael Chen - Director', label: 'Michael Chen - Director' },
                    { value: 'Emily Davis - VP', label: 'Emily Davis - VP' }
                  ]}
                />
              </div>

              <div>
                <label htmlFor="approvalDate" className="block text-sm font-medium text-neutral-700 mb-1">
                  Date
                </label>
                <EditableField
                  value={approval.date || ''}
                  onSave={(value) => updateApprovalWorkflow(index, 'date', value)}
                  type="date"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="approvalComments" className="block text-sm font-medium text-neutral-700 mb-1">
                  Comments
                </label>
                <EditableField
                  value={approval.comments || ''}
                  onSave={(value) => updateApprovalWorkflow(index, 'comments', value)}
                  placeholder="Approval comments"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderStatusTab = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Status & Tracking</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="coupaStatus" className="block text-sm font-medium text-neutral-700 mb-2">
            Coupa Status
          </label>
          <EditableField
            value={editedTransaction?.coupaStatus || ''}
            onSave={(value) => handleFieldUpdate('coupaStatus', value)}
            type="select"
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'submitted', label: 'Submitted' },
              { value: 'approved', label: 'Approved' },
              { value: 'ordered', label: 'Ordered' },
              { value: 'received', label: 'Received' },
              { value: 'invoiced', label: 'Invoiced' },
              { value: 'paid', label: 'Paid' }
            ]}
          />
        </div>

        <div>
          <label htmlFor="receiptStatus" className="block text-sm font-medium text-neutral-700 mb-2">
            Receipt Status
          </label>
          <EditableField
            value={editedTransaction?.receiptStatus || ''}
            onSave={(value) => handleFieldUpdate('receiptStatus', value)}
            type="select"
            options={[
              { value: 'not_received', label: 'Not Received' },
              { value: 'partial', label: 'Partial' },
              { value: 'complete', label: 'Complete' }
            ]}
          />
        </div>

        <div>
          <label htmlFor="invoiceStatus" className="block text-sm font-medium text-neutral-700 mb-2">
            Invoice Status
          </label>
          <EditableField
            value={editedTransaction?.invoiceStatus || ''}
            onSave={(value) => handleFieldUpdate('invoiceStatus', value)}
            type="select"
            options={[
              { value: 'not_invoiced', label: 'Not Invoiced' },
              { value: 'invoiced', label: 'Invoiced' },
              { value: 'paid', label: 'Paid' }
            ]}
          />
        </div>

        <div>
          <label htmlFor="invoiceNumber" className="block text-sm font-medium text-neutral-700 mb-2">
            Invoice Number
          </label>
          <EditableField
            value={editedTransaction?.invoiceNumber || ''}
            onSave={(value) => handleFieldUpdate('invoiceNumber', value)}
            placeholder="Invoice number"
          />
        </div>

        <div>
          <label htmlFor="commodity" className="block text-sm font-medium text-neutral-700 mb-2">
            Commodity
          </label>
          <EditableField
            value={editedTransaction?.commodity || ''}
            onSave={(value) => handleFieldUpdate('commodity', value)}
            placeholder="Commodity classification"
          />
        </div>

        <div>
          <label htmlFor="contractReference" className="block text-sm font-medium text-neutral-700 mb-2">
            Contract Reference
          </label>
          <EditableField
            value={editedTransaction?.contractReference || ''}
            onSave={(value) => handleFieldUpdate('contractReference', value)}
            placeholder="Contract reference number"
          />
        </div>
      </div>

      <div className="bg-neutral-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-neutral-800 mb-3">Coupa Workflow Status</h5>
        <div className="space-y-3">
          {[
            { step: 'Requisition Created', status: 'completed', date: editedTransaction?.date },
            { step: 'Approval Routing', status: editedTransaction?.coupaStatus === 'submitted' ? 'in_progress' : 'completed', date: editedTransaction?.date },
            { step: 'PO Generation', status: editedTransaction?.coupaStatus === 'approved' ? 'completed' : 'pending', date: editedTransaction?.coupaStatus === 'approved' ? editedTransaction?.date : null },
            { step: 'Supplier Notification', status: editedTransaction?.coupaStatus === 'ordered' ? 'completed' : 'pending', date: null },
            { step: 'Receipt Confirmation', status: editedTransaction?.receiptStatus === 'complete' ? 'completed' : 'pending', date: null },
            { step: 'Invoice Processing', status: editedTransaction?.invoiceStatus === 'paid' ? 'completed' : 'pending', date: null }
          ].map((step, index) => {
            const key = `${index}`;
            let statusIcon;
            if (step.status === 'completed') {
              statusIcon = <CheckCircle className="h-5 w-5 text-success-500" />;
            } else if (step.status === 'in_progress') {
              statusIcon = <Clock className="h-4 w-4 text-primary-500" />;
            } else {
              statusIcon = <Clock className="h-4 w-4 text-neutral-400" />;
            }

            return (
              <div key={key} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center space-x-3">
                  {statusIcon} 
                  <span className="text-sm text-neutral-900">{step.step}</span>
                </div>
                <span className="text-xs text-neutral-500">
                  {step.date ? new Date(step.date).toLocaleDateString() : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (!isOpen || !editedTransaction) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Edit Coupa Transaction</h2>
              <p className="text-sm text-neutral-500 mt-1">{editedTransaction.coupaId}</p>
            </div>
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <span className="text-sm text-warning-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Unsaved changes
                </span>
              )}
              <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-neutral-200">
            <nav className="flex space-x-4 px-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'items' && renderLineItemsTab()}
            {activeTab === 'approval' && renderApprovalTab()}
            {activeTab === 'status' && renderStatusTab()}
          </div>

          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                disabled={!hasChanges}
              >
                Save Draft
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSave}
                disabled={!hasChanges}
                isLoading={isSaving}
                leftIcon={<Save size={16} />}
              >
                {isSaving ? 'Syncing to Coupa...' : 'Save & Sync to Coupa'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoupaEditModal;