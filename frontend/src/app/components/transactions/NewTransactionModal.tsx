import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { ModalOverlay } from '../ui/ModalOverlay';
import Bridge from '../../constants/Bridge';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ isOpen, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTo, setIsSendingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedTransactionId, setSavedTransactionId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    vendor: '',
    subsidiary: '',
    date: '',
    poNumber: '',
    currency: 'USD',
    approvalStatus: 'pending_approval',
    memo: '',
    vendorAddress: '',
    paymentTerms: 'net30',
    vendorEmail: '',
    vendorCategory: '',
    items: [{
      item: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      location: '',
      department: '',
      class: '',
      taxCode: '',
      expectedReceiptDate: ''
    }]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await Bridge.transactions.createPurchaseOrder(formData);
      setSavedTransactionId(response.id);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTo = async (system: 'coupa' | 'netsuite' | 'processUnity' | 'wolt') => {
    setIsSendingTo(system);
    setError(null);

    try {
      const sendFunctions = {
        coupa: Bridge.transactions.sendToCoupa,
        netsuite: Bridge.transactions.sendToNetsuite,
        processUnity: Bridge.transactions.sendToProcessUnity,
        wolt: Bridge.transactions.sendToWolt,
      };

      await sendFunctions[system]({ ...formData, transactionId: savedTransactionId });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to send to ${system}`);
    } finally {
      setIsSendingTo(null);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        item: '',
        quantity: 1,
        rate: 0,
        amount: 0,
        location: '',
        department: '',
        class: '',
        taxCode: '',
        expectedReceiptDate: ''
      }]
    }));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Calculate amount if quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].rate);
    }

    setFormData(prev => ({ ...prev, items: newItems }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900">New Purchase Order</h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Purchase Order Information */}
            <div className="space-y-6 mb-8">
              <h3 className="text-lg font-medium text-neutral-900">Purchase Order Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="selectVendor" className="block text-sm font-medium text-neutral-700 mb-1">
                    Vendor *
                  </label>
                  <select
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.vendor}
                    onChange={e => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                  >
                    <option value="">Select Vendor</option>
                    <option value="vendor1">Vendor 1</option>
                    <option value="vendor2">Vendor 2</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="selectSubsidiary" className="block text-sm font-medium text-neutral-700 mb-1">
                    Subsidiary *
                  </label>
                  <select
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.subsidiary}
                    onChange={e => setFormData(prev => ({ ...prev, subsidiary: e.target.value }))}
                  >
                    <option value="">Select Subsidiary</option>
                    <option value="sub1">Subsidiary 1</option>
                    <option value="sub2">Subsidiary 2</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="selectDate" className="block text-sm font-medium text-neutral-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div>
                  <label htmlFor="poNumber" className="block text-sm font-medium text-neutral-700 mb-1">
                    PO Number
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                    value={formData.poNumber}
                    placeholder="Auto-generated"
                    disabled
                  />
                </div>

                <div>
                  <label htmlFor="selectCurrency" className="block text-sm font-medium text-neutral-700 mb-1">
                    Currency *
                  </label>
                  <select
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.currency}
                    onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="approvalStatus" className="block text-sm font-medium text-neutral-700 mb-1">
                    Approval Status *
                  </label>
                  <select
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.approvalStatus}
                    onChange={e => setFormData(prev => ({ ...prev, approvalStatus: e.target.value }))}
                  >
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="memo" className="block text-sm font-medium text-neutral-700 mb-1">
                  Memo / Notes
                </label>
                <textarea
                  rows={3}
                  className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={formData.memo}
                  onChange={e => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                  placeholder="Internal memo for tracking or notes to approvers"
                />
              </div>
            </div>

            {/* Vendor & Terms */}
            <div className="space-y-6 mb-8">
              <h3 className="text-lg font-medium text-neutral-900">Vendor & Terms</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="paymentTerms" className="block text-sm font-medium text-neutral-700 mb-1">
                    Payment Terms *
                  </label>
                  <select
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.paymentTerms}
                    onChange={e => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  >
                    <option value="net30">Net 30</option>
                    <option value="net60">Net 60</option>
                    <option value="net90">Net 90</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="vendorEmail" className="block text-sm font-medium text-neutral-700 mb-1">
                    Vendor Email *
                  </label>
                  <input
                    type="email"
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.vendorEmail}
                    onChange={e => setFormData(prev => ({ ...prev, vendorEmail: e.target.value }))}
                  />
                </div>

                <div>
                  <label htmlFor="vendorCategory" className="block text-sm font-medium text-neutral-700 mb-1">
                    Vendor Category
                  </label>
                  <select
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.vendorCategory}
                    onChange={e => setFormData(prev => ({ ...prev, vendorCategory: e.target.value }))}
                  >
                    <option value="">Select Category</option>
                    <option value="supplier">Supplier</option>
                    <option value="contractor">Contractor</option>
                    <option value="service">Service Provider</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="vendorAddress" className="block text-sm font-medium text-neutral-700 mb-1">
                    Vendor Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.vendorAddress}
                    onChange={e => setFormData(prev => ({ ...prev, vendorAddress: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Item Lines */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-neutral-900">Line Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  Add Item
                </Button>
              </div>

              {formData.items.map((item, index) => {
                const key = `${index}`;
                return (
                  <div key={key} className="border border-neutral-200 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label htmlFor="itemName" className="block text-sm font-medium text-neutral-700 mb-1">
                          Item *
                        </label>
                        <input
                          type="text"
                          required
                          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          value={item.item}
                          onChange={e => updateItem(index, 'item', e.target.value)}
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
                          onChange={e => updateItem(index, 'quantity', e.target.value)}
                        />
                      </div>

                      <div>
                        <label htmlFor="itemRate" className="block text-sm font-medium text-neutral-700 mb-1">
                          Rate *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          value={item.rate}
                          onChange={e => updateItem(index, 'rate', e.target.value)}
                        />
                      </div>

                      <div>
                        <label htmlFor="itemAmount" className="block text-sm font-medium text-neutral-700 mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-neutral-50"
                          value={item.amount}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label htmlFor="itemLocation" className="block text-sm font-medium text-neutral-700 mb-1">
                          Location *
                        </label>
                        <select
                          required
                          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          value={item.location}
                          onChange={e => updateItem(index, 'location', e.target.value)}
                        >
                          <option value="">Select Location</option>
                          <option value="loc1">Location 1</option>
                          <option value="loc2">Location 2</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="itemDepartment" className="block text-sm font-medium text-neutral-700 mb-1">
                          Department *
                        </label>
                        <select
                          required
                          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          value={item.department}
                          onChange={e => updateItem(index, 'department', e.target.value)}
                        >
                          <option value="">Select Department</option>
                          <option value="dept1">Department 1</option>
                          <option value="dept2">Department 2</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="taxCode" className="block text-sm font-medium text-neutral-700 mb-1">
                          Tax Code
                        </label>
                        <select
                          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          value={item.taxCode}
                          onChange={e => updateItem(index, 'taxCode', e.target.value)}
                        >
                          <option value="">Select Tax Code</option>
                          <option value="tax1">VAT</option>
                          <option value="tax2">GST</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="expectedReceiptDate" className="block text-sm font-medium text-neutral-700 mb-1">
                          Expected Receipt Date
                        </label>
                        <input
                          type="date"
                          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          value={item.expectedReceiptDate}
                          onChange={e => updateItem(index, 'expectedReceiptDate', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mt-8 flex items-center justify-end space-x-3">
              <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting || !!isSendingTo}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting} disabled={isSubmitting || !!isSendingTo}>
                Save & Submit
              </Button>
              <Button variant="secondary" type="button" onClick={() => handleSendTo('coupa')} isLoading={isSendingTo === 'coupa'} disabled={isSubmitting || !!isSendingTo}>
                Send to Coupa
              </Button>
              <Button variant="secondary" type="button" onClick={() => handleSendTo('netsuite')} isLoading={isSendingTo === 'netsuite'} disabled={isSubmitting || !!isSendingTo}>
                Send to NetSuite
              </Button>
              <Button variant="secondary" type="button" onClick={() => handleSendTo('processUnity')} isLoading={isSendingTo === 'processUnity'} disabled={isSubmitting || !!isSendingTo}>
                Send to Process Unity
              </Button>
              <Button variant="secondary" type="button" onClick={() => handleSendTo('wolt')} isLoading={isSendingTo === 'wolt'} disabled={isSubmitting || !!isSendingTo}>
                Send to Wolt
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewTransactionModal;