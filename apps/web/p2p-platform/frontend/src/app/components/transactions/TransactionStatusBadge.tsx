import React from 'react';
import { TransactionStatus } from '../../constants/types';

interface TransactionStatusBadgeProps {
  status: TransactionStatus;
  className?: string;
}

const TransactionStatusBadge: React.FC<TransactionStatusBadgeProps> = ({ 
  status,
  className = ''
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'draft':
        return 'bg-neutral-100 text-neutral-700';
      case 'submitted':
        return 'bg-secondary-100 text-secondary-700';
      case 'pending_approval':
        return 'bg-warning-100 text-warning-700';
      case 'approved':
        return 'bg-success-100 text-success-700';
      case 'rejected':
        return 'bg-error-100 text-error-700';
      case ('paid'):
        return 'bg-blue-100 text-blue-700';
      case 'shipped':
        return 'bg-secondary-100 text-secondary-700';
      case 'delivered':
        return 'bg-success-100 text-success-700';
      case 'returned':
        return 'bg-error-100 text-error-700';
      case 'billed':
        return 'bg-neutral-100 text-neutral-700';
      case 'Open':
        return 'bg-blue-100 text-blue-700';
      case 'Closed':
        return 'bg-error-100 text-error-700';
      case 'Fully Received':
        return 'bg-success-100 text-success-700';
      case 'Partially Received':
        return 'bg-warning-100 text-warning-700';
      case 'Pending Approval':
        return 'bg-neutral-100 text-neutral-700';
      case 'Paid':
        return 'bg-success-100 text-success-700';
      case 'Overdue':
        return 'bg-error-100 text-error-700';
      case 'On Hold':
        return 'bg-warning-100 text-warning-700';
      case 'Approved':
        return 'bg-success-100 text-success-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const formatStatus = (status: TransactionStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()} ${className}`}>
      {formatStatus(status)}
    </span>
  );
};

export default TransactionStatusBadge;