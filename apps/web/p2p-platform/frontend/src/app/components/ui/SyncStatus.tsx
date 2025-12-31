import React from 'react';
import { CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';

interface SyncStatusProps {
  status: 'synced' | 'syncing' | 'error' | 'pending';
  lastSync?: string;
  systems?: string[];
  className?: string;
}

const SyncStatus: React.FC<SyncStatusProps> = ({
  status,
  lastSync,
  systems = [],
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-success-600',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200',
          text: 'Synced'
        };
      case 'syncing':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          color: 'text-primary-600',
          bgColor: 'bg-primary-50',
          borderColor: 'border-primary-200',
          text: 'Syncing...'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-error-600',
          bgColor: 'bg-error-50',
          borderColor: 'border-error-200',
          text: 'Sync Failed'
        };
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'text-warning-600',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200',
          text: 'Pending Sync'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${config.bgColor} ${config.borderColor} ${className}`}>
      <span className={config.color}>
        {config.icon}
      </span>
      <span className={`text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
      {lastSync && (
        <span className="text-xs text-neutral-500">
          • {lastSync}
        </span>
      )}
      {systems.length > 0 && (
        <span className="text-xs text-neutral-500">
          → {systems.join(', ')}
        </span>
      )}
    </div>
  );
};

export default SyncStatus;