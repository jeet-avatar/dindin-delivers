import React from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Button from './Button';
import { useSystemSync } from '../../hooks/useSystemSync';

const BidirectionalSyncPanel: React.FC = () => {
  const { syncQueue, processSyncQueue, retrySyncOperation, isProcessing } = useSystemSync();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-error-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-primary-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-warning-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-50 text-success-700';
      case 'failed':
        return 'bg-error-50 text-error-700';
      case 'syncing':
        return 'bg-primary-50 text-primary-700';
      default:
        return 'bg-warning-50 text-warning-700';
    }
  };

  const recentOperations = syncQueue.slice(-5).reverse();

  return (
    <div className="bg-white rounded-lg shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-neutral-900">System Synchronization</h2>
        <div className="flex items-center space-x-2">
          {isProcessing && (
            <div className="flex items-center text-primary-600">
              <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              <span className="text-sm">Processing...</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={16} />}
            onClick={processSyncQueue}
            disabled={isProcessing}
          >
            Sync Now
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {['Coupa', 'NetSuite', 'ZIP', 'Process Unity', 'Wolt NetSuite'].map((system) => {
            const systemOps = syncQueue.filter(op => 
              op.data?.targetSystems?.includes(system) || 
              ['Coupa', 'NetSuite', 'ZIP'].includes(system)
            );
            const pendingCount = systemOps.filter(op => op.status === 'pending').length;
            const failedCount = systemOps.filter(op => op.status === 'failed').length;

            let progressWidth = '75%';
            if (pendingCount === 0 && failedCount === 0) {
              progressWidth = '100%';
            } else if (failedCount > 0) {
              progressWidth = '25%';
            }

            return (
              <div key={system} className="p-4 border border-neutral-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-900">{system}</span>
                  <div className="flex items-center space-x-1">
                    {failedCount > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-700">
                        {failedCount} failed
                      </span>
                    )}
                    {pendingCount > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
                        {pendingCount} pending
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-1">
                  <div className="bg-primary-600 h-1 rounded-full transition-all duration-300" style={{ width: progressWidth }} />
                </div>
              </div>
            );
          })}
        </div>

        {recentOperations.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-neutral-900 mb-3">Recent Sync Operations</h3>
            <div className="space-y-2">
              {recentOperations.map((operation) => (
                <div key={operation.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(operation.status)}
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {operation.operation} {operation.entityType}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {operation.system} • {new Date(operation.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(operation.status)}`}>
                      {operation.status}
                    </span>
                    {operation.status === 'failed' && operation.retryCount < 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retrySyncOperation(operation.id)}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {syncQueue.length === 0 && (
          <div className="text-center py-8 text-neutral-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success-500" />
            <p>All systems are in sync</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BidirectionalSyncPanel;