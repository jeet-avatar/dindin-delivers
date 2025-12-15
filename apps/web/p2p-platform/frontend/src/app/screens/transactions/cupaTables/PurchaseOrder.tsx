
import { useState } from 'react';
import { ExternalLink, Eye, } from 'lucide-react';
import TransactionStatusBadge from '../../../components/transactions/TransactionStatusBadge';
import Button from '../../../components/ui/Button';
import moment from 'moment'
import AllTransactionModal from '../../../components/transactions/AllTransactionModal';

const PurchaseOrder = (props:any) => {

    const {records, activeTransactionType} = props
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    
    return (
        <div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                        <tr>  
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Sr No
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            PO Number
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Supplier Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            For Employee
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Memo
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Total Amount
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Issue Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Status
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead> 
                    <tbody className="bg-white divide-y divide-neutral-200">
                        {records.map((transaction: any, index: number) => {
                            return (
                                <tr key={`${transaction['Coupa ID']}-${transaction['For_Employee']}`} className="hover:bg-neutral-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                                        {index+1}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-600">
                                        {transaction['Number']}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-600">
                                        {transaction['Supplier'] ? transaction['Supplier'] : "---"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-600">
                                        {transaction['For_Employee'] ? transaction['For_Employee'] : "---"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-600">
                                        {transaction['HEADER_MEMO'] ? transaction['HEADER_MEMO'] : "---"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-600">
                                        ${transaction['Amount'] ? transaction['Amount'] : 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-600">
                                        {transaction['Date'] ? moment(transaction['Date']).format('YYYY-MM-DD') : "---"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-600">
                                        <TransactionStatusBadge status={transaction['Status']} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                                    <div className="flex items-center space-x-2">
                                        <Button
                                        variant="outline"
                                            size="sm"
                                            leftIcon={<Eye size={14} />}
                                            onClick={() => {
                                                setSelectedTransaction(transaction);
                                                setShowEditModal(true);
                                            }}
                                        >
                                            View
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            leftIcon={<ExternalLink size={14} />}
                                            onClick={() => window.open(`https://coupa.com/transactions/${transaction['Coupa ID']}`, '_blank')}
                                        >
                                            Open in Coupa
                                        </Button>
                                    </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
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

export default PurchaseOrder;