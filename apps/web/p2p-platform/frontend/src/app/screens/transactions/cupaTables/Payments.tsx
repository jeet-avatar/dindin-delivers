import { useState } from 'react';
import Button from '../../../components/ui/Button';
import TransactionStatusBadge from '../../../components/transactions/TransactionStatusBadge';
import { ExternalLink, Eye } from 'lucide-react';
import moment from 'moment';
import AllTransactionModal from '../../../components/transactions/AllTransactionModal';

const CupaPayments = ({ records, activeTransactionType }: any) => {
  const [showEditModal, setShowEditModal]             = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Sr No
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
              Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
              Supplier
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        
        <tbody className="bg-white divide-y divide-neutral-200">
          {records.map((t: any, index: number) => {
            return (
              <tr key={`${t['Coupa ID']}-${t['For_Employee']}`} className="hover:bg-neutral-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                  {index+1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                  <a
                    href={`https://coupa.com/transactions/${t['Coupa ID']}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t['Number']}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                  {t['Supplier'] ? t['Supplier'] : "---"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                  {t['Amount'] ? t['Amount'] : 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                  {t['Date'] ? moment(t['Date']).format('YYYY-MM-DD') : "---"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                  <TransactionStatusBadge status={t['Status']} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye size={14} />}
                        onClick={() => {
                            setSelectedTransaction(t);
                            setShowEditModal(true);
                        }}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<ExternalLink size={14} />}
                      onClick={() =>
                        window.open(
                          `https://coupa.com/transactions/${t['Coupa ID']}`,
                          '_blank'
                        )
                      }
                    >
                      Open
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <AllTransactionModal
          isOpen={showEditModal}
          onClose={() => {
              setShowEditModal(false);
              setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          activeTransactionType={activeTransactionType}
      />
    </div>
  );
};

export default CupaPayments;