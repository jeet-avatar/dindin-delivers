import React, { useState } from 'react';
import { X, Download, FileText, Image, File } from 'lucide-react';
import Button from './Button';
import { ModalOverlay } from '../ui/ModalOverlay';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    name: string;
    type: string;
    url: string;
    uploadDate: string;
    size?: number;
  } | null;
  onReplace?: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  isOpen,
  onClose,
  document,
  onReplace
}) => {
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen || !document) return null;

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-error-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-5 w-5 text-primary-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-primary-500" />;
      default:
        return <File className="h-5 w-5 text-neutral-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = document.url;
    link.download = document.name;
    link.click();
  };

  const isPDF = document.name.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(document.name);

  // Extract the preview content into a variable to avoid nested ternary
  let previewContent: React.ReactNode;
  if (isPDF) {
    previewContent = (
      <div className="w-full h-[600px] border border-neutral-200 rounded-lg overflow-hidden">
        <iframe
          src={`${document.url}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full h-full"
          title={document.name}
          onLoad={() => setIsLoading(false)}
        />
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>
    );
  } else if (isImage) {
    previewContent = (
      <div className="flex justify-center">
        <img
          src={document.url}
          alt={document.name}
          className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  } else {
    previewContent = (
      <div className="text-center py-12">
        <div className="flex flex-col items-center space-y-4">
          {getFileIcon(document.name)}
          <div>
            <p className="text-lg font-medium text-neutral-900">{document.name}</p>
            <p className="text-sm text-neutral-500">
              This file type cannot be previewed in the browser
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Download size={16} />}
            onClick={handleDownload}
          >
            Download to View
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <div className="flex items-center space-x-3">
              {getFileIcon(document.name)}
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">{document.name}</h2>
                <p className="text-sm text-neutral-500">
                  Uploaded: {new Date(document.uploadDate).toLocaleDateString()} • {formatFileSize(document.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download size={16} />}
                onClick={handleDownload}
              >
                Download
              </Button>
              {onReplace && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<FileText size={16} />}
                  onClick={onReplace}
                >
                  Replace
                </Button>
              )}
              <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
            {previewContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;