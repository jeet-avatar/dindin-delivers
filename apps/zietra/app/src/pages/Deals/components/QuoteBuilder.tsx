import { useState } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { quotesApi } from '../../../services/api';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteBuilderProps {
  dealId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function QuoteBuilder({ dealId, onClose, onSaved }: QuoteBuilderProps) {
  const [title, setTitle] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed values — derived during render, not stored in state
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const updateLineItem = (index: number, field: string, value: string | number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Recalculate row total whenever qty or price changes
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unitPrice: 0, total: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || lineItems.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await quotesApi.create({
        dealId,
        title,
        lineItems,
        subtotal,
        tax: taxAmount,
        total,
        notes: notes || undefined,
        validUntil: validUntil || undefined,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create quote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#161625] rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a44]">
          <h2 className="text-xl font-bold text-[#F1F5F9]">New Quote</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#1c1c30] text-[#94A3B8] transition-colors"
            title="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="quote-title" className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Quote Title *
            </label>
            <input
              id="quote-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="e.g. Website Redesign Proposal"
            />
          </div>

          {/* Line Items */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Line Items</label>
            <div className="overflow-x-auto rounded-lg border border-[#2a2a44]">
              <table className="w-full text-sm">
                <thead className="bg-[#12121f]">
                  <tr className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Unit Price</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1c30]">
                  {lineItems.map((item, index) => (
                    <tr key={index} className="bg-[#161625]">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="input-field"
                          style={{ minWidth: '200px' }}
                          placeholder="Item description"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="input-field"
                          style={{ width: '70px' }}
                          min="1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          className="input-field"
                          style={{ width: '100px' }}
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2 text-[#CBD5E1] font-medium whitespace-nowrap">
                        ${item.total.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length <= 1}
                          className="p-1 rounded hover:bg-red-500/10 text-[#64748B] hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Remove row"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addLineItem}
              className="mt-2 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Line Item
            </button>
          </div>

          {/* Totals summary — right-aligned */}
          <div className="flex justify-end">
            <div className="space-y-1 text-sm w-56">
              <div className="flex justify-between text-[#94A3B8]">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Tax ({taxRate}%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#F1F5F9] border-t border-[#2a2a44] pt-1">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Tax Rate, Valid Until, Notes — in a grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tax-rate" className="block text-sm font-medium text-[#CBD5E1] mb-1">
                Tax Rate (%)
              </label>
              <input
                id="tax-rate"
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="input-field"
                style={{ width: '80px' }}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label htmlFor="valid-until" className="block text-sm font-medium text-[#CBD5E1] mb-1">
                Valid Until
              </label>
              <input
                id="valid-until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="quote-notes" className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Notes
            </label>
            <textarea
              id="quote-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              rows={3}
              placeholder="Additional notes or terms..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2a2a44]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-[#33335a] rounded-lg hover:bg-[#12121f] transition-colors font-medium text-[#CBD5E1]"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {loading ? 'Creating...' : 'Create Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
