import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './Button';
import DocumentUpload from './DocumentUpload';
import { ModalOverlay } from '../ui/ModalOverlay';

interface DocumentReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    name: string;
    type: string;
    category: string;
  } | null;
  onReplace: (file: File, metadata: any) => Promise<void>;
}

const DocumentReplaceModal: React.FC<DocumentReplaceModalProps> = ({
  isOpen,
  onClose,
  document,
  onReplace
}) => {
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceStatus, setReplaceStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const handleReplace = async (file: File, metadata: any) => {
    setIsReplacing(true);
    setReplaceStatus('uploading');

    try {
      await onReplace(file, {
        ...metadata,
        category: document?.category,
        replacingDocument: document?.name
      });
      
      setReplaceStatus('success');
      
      // Close modal after successful replacement
      setTimeout(() => {
        onClose();
        setReplaceStatus('idle');
        setIsReplacing(false);
      }, 2000);
    } catch (error) {
      console.error('Error replacing document:', error);
      setReplaceStatus('error');
      setIsReplacing(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900">Replace Document</h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-warning-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning-800">Replace Existing Document</p>
                    <p className="text-sm text-warning-700 mt-1">
                      You are about to replace "<strong>{document.name}</strong>". 
                      The current document will be archived and the new document will be synced to all integrated systems.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {replaceStatus === 'success' ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success-500" />
                <h3 className="text-lg font-medium text-success-900 mb-2">Document Replaced Successfully</h3>
                <p className="text-sm text-success-700">
                  The new document has been uploaded and synced to all integrated systems.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900">Upload New Document</h3>
                <DocumentUpload
                  onUpload={handleReplace}
                  acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.png', '.xlsx']}
                  maxSize={25}
                  category={document.category}
                />
                
                <div className="bg-primary-50 rounded-lg p-4">
                  <p className="text-sm text-primary-800">
                    <strong>Auto-sync enabled:</strong> The replacement document will be automatically synced to:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['ZIP', 'Coupa', 'NetSuite', 'Process Unity'].map((system) => (
                      <span key={system} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                        {system}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isReplacing}
            >
              {replaceStatus === 'success' ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentReplaceModal;