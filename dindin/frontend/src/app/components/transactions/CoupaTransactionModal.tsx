import React, { useState } from 'react';
import { X, Plus, Trash2, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import DocumentUpload from '../ui/DocumentUpload';
import { ModalOverlay } from '../ui/ModalOverlay';

interface CoupaTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: any) => void;
}

const CoupaTransactionModal: React.FC<CoupaTransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  interface Attachment {
    id: string;
    name: string;
    type: string;
    url: string;
  }

  interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category: string;
    account: string;
    commodity: string;
    needByDate: string;
    specifications: string;
  }

  interface ApprovalStep {
    step: number;
    approver: string;
    required: boolean;
  }

  interface FormData {
    requisitionTitle: string;
    businessJustification: string;
    department: string;
    costCenter: string;
    buyer: string;
    supplier: string;
    currency: string;
    deliveryDate: string;
    urgency: string;
    approvalWorkflow: ApprovalStep[];
    lineItems: LineItem[];
    attachments: Attachment[];
    shippingAddress: string;
    billingAddress: string;
    paymentTerms: string;
    taxExempt: boolean;
    specialInstructions: string;
    contractReference: string;
    budgetCode: string;
  }

  const [formData, setFormData] = useState<FormData>({
    // Requisition Header
    requisitionTitle: '',
    businessJustification: '',
    department: '',
    costCenter: '',
    buyer: '',
    supplier: '',
    currency: 'USD',
    deliveryDate: '',
    urgency: 'medium',
    
    // Approval Workflow
    approvalWorkflow: [
      { step: 1, approver: '', required: true },
      { step: 2, approver: '', required: false }
    ],
    
    // Line Items
    lineItems: [{
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      category: '',
      account: '',
      commodity: '',
      needByDate: '',
      specifications: ''
    }],
    
    // Attachments
    attachments: [],
    
    // Additional Fields
    shippingAddress: '',
    billingAddress: '',
    paymentTerms: 'net30',
    taxExempt: false,
    specialInstructions: '',
    contractReference: '',
    budgetCode: ''
  });

  const steps = [
    { id: 'header', title: 'Requisition Details' },
    { id: 'items', title: 'Line Items' },
    { id: 'approval', title: 'Approval Workflow' },
    { id: 'attachments', title: 'Attachments' },
    { id: 'review', title: 'Review & Submit' }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAttachmentRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleApproverChange = (index: number, value: string) => {
    const newWorkflow = [...formData.approvalWorkflow];
    newWorkflow[index] = { ...newWorkflow[index], approver: value };
    setFormData(prev => ({ ...prev, approvalWorkflow: newWorkflow }));
  };

  const handleApprovalChange = (index: number, required: boolean) => {
    const newWorkflow = [...formData.approvalWorkflow];
    newWorkflow[index] = { ...newWorkflow[index], required };
    setFormData(prev => ({ ...prev, approvalWorkflow: newWorkflow }));
  };

  const handleSubmit = () => {
    const newTransaction = {
      id: `coupa-${Date.now()}`,
      coupaId: `REQ-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      requisitionNumber: `REQ-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      type: 'purchase_order',
      number: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: formData.deliveryDate,
      amount: formData.lineItems.reduce((sum, item) => sum + item.totalPrice, 0),
      status: 'pending_approval',
      description: formData.requisitionTitle,
      supplier: formData.supplier,
      department: formData.department,
      costCenter: formData.costCenter,
      commodity: formData.lineItems[0]?.commodity || '',
      buyer: formData.buyer,
      approver: formData.approvalWorkflow[0]?.approver || '',
      deliveryDate: formData.deliveryDate,
      receiptStatus: 'not_received',
      invoiceStatus: 'not_invoiced',
      coupaStatus: 'draft',
      urgency: formData.urgency,
      businessJustification: formData.businessJustification,
      lineItems: formData.lineItems,
      approvalWorkflow: formData.approvalWorkflow,
      attachments: formData.attachments
    };

    onSave(newTransaction);
    onClose();
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, {
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        category: '',
        account: '',
        commodity: '',
        needByDate: '',
        specifications: ''
      }]
    }));
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.lineItems];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = Number(newItems[index].quantity) * Number(newItems[index].unitPrice);
    }

    setFormData(prev => ({ ...prev, lineItems: newItems }));
  };

  const removeLineItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const addApprover = () => {
    setFormData(prev => ({
      ...prev,
      approvalWorkflow: [...prev.approvalWorkflow, {
        step: prev.approvalWorkflow.length + 1,
        approver: '',
        required: false
      }]
    }));
  };

  const handleDocumentUpload = async (file: File) => {
    const attachment = {
      id: `att-${Date.now()}`,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file)
    };

    setFormData((prev: any) => ({
      ...prev,
      attachments: [...prev.attachments, attachment]
    }));
  };

  const renderHeaderStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-neutral-900">Requisition Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label htmlFor="requisitionTitle" className="block text-sm font-medium text-neutral-700 mb-1">
            Requisition Title *
          </label>
          <input
            type="text"
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.requisitionTitle}
            onChange={e => setFormData(prev => ({ ...prev, requisitionTitle: e.target.value }))}
            placeholder="Brief description of what you're requesting"
          />
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium text-neutral-700 mb-1">
            Department *
          </label>
          <select
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.department}
            onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
          >
            <option value="">Select Department</option>
            <option value="IT">IT</option>
            <option value="Marketing">Marketing</option>
            <option value="Operations">Operations</option>
            <option value="Finance">Finance</option>
            <option value="HR">HR</option>
          </select>
        </div>

        <div>
          <label htmlFor="costCenter" className="block text-sm font-medium text-neutral-700 mb-1">
            Cost Center *
          </label>
          <select
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.costCenter}
            onChange={e => setFormData(prev => ({ ...prev, costCenter: e.target.value }))}
          >
            <option value="">Select Cost Center</option>
            <option value="CC-IT-001">IT Operations</option>
            <option value="CC-MKT-001">Marketing</option>
            <option value="CC-OPS-001">Operations</option>
            <option value="CC-FIN-001">Finance</option>
          </select>
        </div>

        <div>
          <label htmlFor="preferredSupplier" className="block text-sm font-medium text-neutral-700 mb-1">
            Preferred Supplier
          </label>
          <select
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.supplier}
            onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
          >
            <option value="">Select Supplier (Optional)</option>
            <option value="Office Solutions Inc.">Office Solutions Inc.</option>
            <option value="Tech Hardware Pro">Tech Hardware Pro</option>
            <option value="Creative Solutions Ltd.">Creative Solutions Ltd.</option>
          </select>
        </div>

        <div>
          <label htmlFor="deliveryDate" className="block text-sm font-medium text-neutral-700 mb-1">
            Delivery Date *
          </label>
          <input
            type="date"
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.deliveryDate}
            onChange={e => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="urgencyLevel" className="block text-sm font-medium text-neutral-700 mb-1">
            Urgency Level *
          </label>
          <select
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.urgency}
            onChange={e => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="businessJustification" className="block text-sm font-medium text-neutral-700 mb-1">
            Business Justification *
          </label>
          <textarea
            required
            rows={3}
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.businessJustification}
            onChange={e => setFormData(prev => ({ ...prev, businessJustification: e.target.value }))}
            placeholder="Explain why this purchase is necessary for business operations"
          />
        </div>
      </div>
    </div>
  );

  const renderLineItemsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-neutral-900">Line Items</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={addLineItem}
        >
          Add Item
        </Button>
      </div>

      {formData.lineItems.map((item, index) => {
        const key = `${index}`;
        return (
          <div key={key} className="border border-neutral-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-neutral-900">Item {index + 1}</h4>
              {formData.lineItems.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 size={14} />}
                  onClick={() => removeLineItem(index)}
                  className="text-error-600 border-error-600 hover:bg-error-50"
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="itemDescription" className="block text-sm font-medium text-neutral-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={item.description}
                  onChange={e => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Detailed item description"
                />
              </div>

              <div>
                <label htmlFor="itemQuantity" className="block text-sm font-medium text-neutral-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={item.quantity}
                  onChange={e => updateLineItem(index, 'quantity', Number(e.target.value))}
                />
              </div>

              <div>
                <label htmlFor="itemUnitPrice" className="block text-sm font-medium text-neutral-700 mb-1">
                  Unit Price *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={item.unitPrice}
                  onChange={e => updateLineItem(index, 'unitPrice', Number(e.target.value))}
                />
              </div>

              <div>
                <label htmlFor="itemTotalPrice" className="block text-sm font-medium text-neutral-700 mb-1">
                  Total Price
                </label>
                <input
                  type="number"
                  className="block w-full rounded-md border-neutral-300 shadow-sm bg-neutral-50"
                  value={item.totalPrice}
                  disabled
                />
              </div>

              <div>
                <label htmlFor="itemCategory" className="block text-sm font-medium text-neutral-700 mb-1">
                  Category *
                </label>
                <select
                  required
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={item.category}
                  onChange={e => updateLineItem(index, 'category', e.target.value)}
                >
                  <option value="">Select Category</option>
                  <option value="IT Equipment">IT Equipment</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Professional Services">Professional Services</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Facilities">Facilities</option>
                </select>
              </div>

              <div>
                <label htmlFor="itemAccount" className="block text-sm font-medium text-neutral-700 mb-1">
                  Account *
                </label>
                <select
                  required
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={item.account}
                  onChange={e => updateLineItem(index, 'account', e.target.value)}
                >
                  <option value="">Select Account</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Services">Services</option>
                  <option value="Marketing Expense">Marketing Expense</option>
                </select>
              </div>

              <div>
                <label htmlFor="itemCommodity" className="block text-sm font-medium text-neutral-700 mb-1">
                  Commodity
                </label>
                <input
                  type="text"
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={item.commodity}
                  onChange={e => updateLineItem(index, 'commodity', e.target.value)}
                  placeholder="Commodity code or description"
                />
              </div>

              <div>
                <label htmlFor="itemNeedByDate" className="block text-sm font-medium text-neutral-700 mb-1">
                  Need By Date
                </label>
                <input
                  type="date"
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={item.needByDate}
                  onChange={e => updateLineItem(index, 'needByDate', e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="itemSpecifications" className="block text-sm font-medium text-neutral-700 mb-1">
                  Specifications
                </label>
                <textarea
                  rows={2}
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={item.specifications}
                  onChange={e => updateLineItem(index, 'specifications', e.target.value)}
                  placeholder="Technical specifications or requirements"
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
              ${formData.lineItems.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString()}
            </p>
          </div>
          <FileText className="h-8 w-8 text-primary-600" />
        </div>
      </div>
    </div>
  );

  const renderApprovalStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-neutral-900">Approval Workflow</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={addApprover}
        >
          Add Approver
        </Button>
      </div>

      {formData.approvalWorkflow.map((approval, index) => {
        const key = `${index}`;
        return (
          <div key={key} className="border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-neutral-900">Approval Step {approval.step}</h4>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  approval.required ? 'bg-error-100 text-error-700' : 'bg-success-100 text-success-700'
                }`}>
                  {approval.required ? 'Required' : 'Optional'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="approvalApprover" className="block text-sm font-medium text-neutral-700 mb-1">
                  Approver *
                </label>
                <select
                  required={approval.required}
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={approval.approver}
                  onChange={(e) => handleApproverChange(index, e.target.value)}
                >
                  <option value="">Select Approver</option>
                  <option value="John Doe - Manager">John Doe - Manager</option>
                  <option value="Sarah Johnson - Finance">Sarah Johnson - Finance</option>
                  <option value="Michael Chen - Director">Michael Chen - Director</option>
                  <option value="Emily Davis - VP">Emily Davis - VP</option>
                </select>
              </div>

              <div className="flex items-center space-x-4 pt-6">
                <label htmlFor="checkboxApprovalWorkflow" className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                    checked={approval.required}
                    onChange={(e) => handleApprovalChange(index, e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-neutral-700">Required Approval</span>
                </label>
              </div>
            </div>
          </div>
        );
      })}

      <div className="bg-warning-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-warning-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning-800">Coupa Approval Workflow</p>
            <p className="text-sm text-warning-700 mt-1">
              Approval workflow will be automatically routed in Coupa based on amount thresholds and department policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttachmentsStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-neutral-900">Supporting Documents</h3>
      
      <DocumentUpload
        onUpload={handleDocumentUpload}
        acceptedTypes={['.pdf', '.doc', '.docx', '.xlsx', '.jpg', '.png']}
        maxSize={25}
        category="coupa_requisition"
      />

      {formData.attachments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-700">Uploaded Documents</h4>
          {formData.attachments.map((attachment, index) => {
            const key = `${index}`;
            return (
              <div key={key} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{attachment.name}</p>
                    <p className="text-xs text-neutral-500">{attachment.type}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 size={14} />}
                  onClick={() => handleAttachmentRemove(index)}
                  className="text-error-600 border-error-600 hover:bg-error-50"
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-primary-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FileText className="h-5 w-5 text-primary-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary-800">Document Requirements</p>
            <p className="text-sm text-primary-700 mt-1">
              Attach quotes, specifications, or other supporting documents. These will be included in the Coupa requisition for approver review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-neutral-900">Review Requisition</h3>
      
      <div className="bg-neutral-50 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-neutral-600">Requisition Title</p>
            <p className="font-medium text-neutral-900">{formData.requisitionTitle}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Department</p>
            <p className="font-medium text-neutral-900">{formData.department}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Total Amount</p>
            <p className="font-medium text-neutral-900">
              ${formData.lineItems.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Delivery Date</p>
            <p className="font-medium text-neutral-900">{formData.deliveryDate}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-neutral-600">Business Justification</p>
          <p className="font-medium text-neutral-900">{formData.businessJustification}</p>
        </div>

        <div>
          <p className="text-sm text-neutral-600">Line Items ({formData.lineItems.length})</p>
          <div className="space-y-2 mt-2">
            {formData.lineItems.map((item, index) => {
              const key = `${index}`;
              return (
                <div key={key} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-sm text-neutral-900">{item.description}</span>
                  <span className="text-sm font-medium text-neutral-900">
                    {item.quantity} × ${item.unitPrice} = ${item.totalPrice.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-primary-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-primary-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary-800">Ready to Submit</p>
            <p className="text-sm text-primary-700 mt-1">
              This requisition will be submitted to Coupa and routed through the approval workflow you've configured.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900">New Coupa Requisition</h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
              <X size={20} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                let statusClass = '';
                if (index < currentStep) {
                  statusClass = 'bg-primary-600 text-white';
                } else if (index === currentStep) {
                  statusClass = 'bg-primary-100 text-primary-600 border-2 border-primary-600';
                } else {
                  statusClass = 'bg-neutral-100 text-neutral-400';
                }                 

                return (  
                  <div key={step.id} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${statusClass}`}>
                      {index < currentStep ? <CheckCircle size={16} /> : index + 1}
                    </div>
                    <span className={`ml-2 text-sm font-medium hidden lg:block ${
                      index <= currentStep ? 'text-neutral-900' : 'text-neutral-400'
                    }`}>
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <div className="w-12 lg:w-20 mx-2 h-0.5 bg-neutral-200">
                        <div
                          className="h-full bg-primary-600 transition-all duration-300"
                          style={{ width: index < currentStep ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {currentStep === 0 && renderHeaderStep()}
            {currentStep === 1 && renderLineItemsStep()}
            {currentStep === 2 && renderApprovalStep()}
            {currentStep === 3 && renderAttachmentsStep()}
            {currentStep === 4 && renderReviewStep()}
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Save Draft
              </Button>
              {currentStep === steps.length - 1 ? (
                <Button variant="primary" onClick={handleSubmit}>
                  Submit to Coupa
                </Button>
              ) : (
                <Button variant="primary" onClick={handleNext}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoupaTransactionModal;