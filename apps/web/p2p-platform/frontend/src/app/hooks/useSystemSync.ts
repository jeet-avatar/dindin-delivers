import React, { useState, useCallback } from 'react';

interface SyncOperation {
  id: string;
  system: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: any;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  timestamp: string;
  retryCount: number;
}

export const useSystemSync = () => {
  const [syncQueue, setSyncQueue] = useState<SyncOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addToSyncQueue = useCallback((
    system: string,
    operation: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    data: any
  ) => {
    const syncOp: SyncOperation = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      system,
      operation,
      entityType,
      entityId,
      data,
      status: 'pending',
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    setSyncQueue(prev => [...prev, syncOp]);
    return syncOp.id;
  }, []);

  const syncToSystem = useCallback(async (system: string, operation: SyncOperation) => {
    console.log('Syncing to', system, ':', operation);
    
    // Simulate API call to external system
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      // Simulate occasional failures for demonstration
      if (Math.random() < 0.1) {
        throw new Error(`Sync failed for ${system}`);
      }

      console.log(`Successfully synced to ${system}`);
      return { success: true };
    } catch (error: unknown) {
      console.error('Failed to sync to', system, ':', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }, []);

  const processSyncQueue = useCallback(async () => {
    if (isProcessing || syncQueue.length === 0) return;

    setIsProcessing(true);
    
    const pendingOps = syncQueue.filter(op => op.status === 'pending');
    
    for (const operation of pendingOps) {
      // Update status to syncing
      setSyncQueue(prev => 
        prev.map(op => 
          op.id === operation.id ? { ...op, status: 'syncing' } : op
        )
      );

      // Determine which systems to sync to based on entity type
      const systemsToSync = getSystemsForEntity(operation.entityType);
      
      for (const system of systemsToSync) {
        const result = await syncToSystem(system, operation);
        
        if (result.success) {
          setSyncQueue(prev => 
            prev.map(op => 
              op.id === operation.id ? { ...op, status: 'completed' } : op
            )
          );
        } else {
          setSyncQueue(prev => 
            prev.map(op => 
              op.id === operation.id ? { 
                ...op, 
                status: 'failed', 
                retryCount: op.retryCount + 1 
              } : op
            )
          );
        }
      }
    }

    setIsProcessing(false);
  }, [syncQueue, isProcessing, syncToSystem]);

  const getSystemsForEntity = (entityType: string): string[] => {
    const entitySystemMap = {
      'transaction': ['Coupa', 'NetSuite', 'ZIP'],
      'document': ['Coupa', 'NetSuite', 'ZIP', 'Process Unity'],
      'profile': ['Coupa', 'NetSuite', 'ZIP', 'Process Unity'],
      'purchase_order': ['Coupa', 'NetSuite'],
      'invoice': ['NetSuite', 'ZIP'],
      'payment': ['ZIP', 'NetSuite'],
      'security_document': ['Process Unity', 'Coupa'],
      'tax_document': ['Coupa', 'NetSuite', 'ZIP']
    };

    return entitySystemMap[entityType as keyof typeof entitySystemMap] || ['Coupa'];
  };

  const retrySyncOperation = useCallback(async (operationId: string) => {
    const operation = syncQueue.find(op => op.id === operationId);
    if (!operation || operation.retryCount >= 3) return;

    setSyncQueue(prev => 
      prev.map(op => 
        op.id === operationId ? { ...op, status: 'pending' } : op
      )
    );

    await processSyncQueue();
  }, [syncQueue, processSyncQueue]);

  // Auto-process queue when new items are added
  React.useEffect(() => {
    const timer = setTimeout(() => {
      processSyncQueue();
    }, 1000);

    return () => clearTimeout(timer);
  }, [syncQueue.length, processSyncQueue]);

  return {
    syncQueue,
    addToSyncQueue,
    processSyncQueue,
    retrySyncOperation,
    isProcessing
  };
};