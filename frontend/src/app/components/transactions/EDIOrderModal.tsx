import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { ModalOverlay } from '../ui/ModalOverlay';

interface EDIOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EDIOrderModal: React.FC<EDIOrderModalProps> = ({ isOpen, onClose }) => {
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
    ediFormat: 'x12',
    ediVersion: '4010',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
    onClose();
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
            <h2 className="text-xl font-semibold text-neutral-900">New EDI Order</h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* EDI Information */}
            <div className="space-y-6 mb-8">
              <h3 className="text-lg font-medium text-neutral-900">EDI Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="ediFormat" className="block text-sm font-medium text-neutral-700 mb-1">
                    EDI Format *
                  </label>
                  <select
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.ediFormat}
                    onChange={e => setFormData(prev => ({ ...prev, ediFormat: e.target.value }))}
                  >
                    <option value="x12">X12</option>
                    <option value="edifact">EDIFACT</option>
                    <option value="xml">XML</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ediVersion" className="block text-sm font-medium text-neutral-700 mb-1">
                    EDI Version *
                  </label>
                  <select
                    required
                    className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.ediVersion}
                    onChange={e => setFormData(prev => ({ ...prev, ediVersion: e.target.value }))}
                  >
                    <option value="4010">4010</option>
                    <option value="5010">5010</option>
                    <option value="6020">6020</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="vendorSelect" className="block text-sm font-medium text-neutral-700 mb-1">
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
                  <label htmlFor="subsidiarySelect" className="block text-sm font-medium text-neutral-700 mb-1">
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
                  <label htmlFor="currencySelect" className="block text-sm font-medium text-neutral-700 mb-1">
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
                        <label htmlFor="itemTaxCode" className="block text-sm font-medium text-neutral-700 mb-1">
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
                        <label htmlFor="itemExpectedReceiptDate" className="block text-sm font-medium text-neutral-700 mb-1">
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

            <div className="mt-8 flex items-center justify-end space-x-3">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create EDI Order
              </Button>
              <Button variant="secondary" type="button">
                Send to Coupa
              </Button>
              <Button variant="secondary" type="button">
                Send to NetSuite
              </Button>
              <Button variant="secondary" type="button">
                Send to Process Unity
              </Button>
              <Button variant="secondary" type="button">
                Send to Wolt
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EDIOrderModal;