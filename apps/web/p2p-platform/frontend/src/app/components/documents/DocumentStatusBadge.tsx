import React from 'react';
import { DocumentStatus } from '../../constants/types';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({ 
  status,
  className = ''
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'valid':
        return 'bg-success-100 text-success-700';
      case 'expiring':
        return 'bg-warning-100 text-warning-700';
      case 'expired':
        return 'bg-error-100 text-error-700';
      case 'missing':
        return 'bg-neutral-100 text-neutral-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()} ${className}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default DocumentStatusBadge;