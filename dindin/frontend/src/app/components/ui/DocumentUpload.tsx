import React, { useState, useRef } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';
import Button from './Button';

interface DocumentUploadProps {
  onUpload: (file: File, metadata: any) => Promise<void>;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  category?: string;
  className?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUpload,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.png'],
  maxSize = 10,
  category = 'general',
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      setUploadStatus('error');
      setUploadMessage(`File type ${fileExtension} not supported. Accepted types: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setUploadStatus('error');
      setUploadMessage(`File size exceeds ${maxSize}MB limit`);
      return;
    }

    setUploadStatus('uploading');
    setUploadMessage('Uploading document...');

    try {
      const metadata = {
        category,
        uploadDate: new Date().toISOString(),
        size: file.size,
        type: file.type,
        name: file.name
      };

      await onUpload(file, metadata);
      setUploadStatus('success');
      setUploadMessage('Document uploaded successfully and synced to integrated systems');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
      }, 3000);
    } catch (error) {
      console.error('Document upload failed:', error);
      setUploadStatus('error');
      setUploadMessage('Upload failed. Please try again.');
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />;
      case 'success':
        return <Check className="h-5 w-5 text-success-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-error-600" />;
      default:
        return <Upload className="h-5 w-5 text-neutral-400" />;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'success':
        return 'border-success-300 bg-success-50';
      case 'error':
        return 'border-error-300 bg-error-50';
      case 'uploading':
        return 'border-primary-300 bg-primary-50';
      default:
        return isDragging ? 'border-primary-300 bg-primary-50' : 'border-neutral-300';
    }
  };

  let statusClass = '';
  if (uploadStatus === 'success') {
    statusClass = 'text-success-600';
  } else if (uploadStatus === 'error') {
    statusClass = 'text-error-600';
  } else {
    statusClass = 'text-primary-600';
  }
  
  let divClass = '';
  if (uploadStatus === 'idle') {
    divClass = 'hover:border-primary-300 hover:bg-primary-50';
  }

  return (
    <div className={className}>
       <button
        type="button"
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${getStatusColor()} ${divClass}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-3">
          {getStatusIcon()}
          
          {uploadStatus === 'idle' && (
            <>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Supports: {acceptedTypes.join(', ')} (max {maxSize}MB)
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
            </>
          )}

          {uploadMessage && (
            <p className={`text-sm ${statusClass}`}>
              {uploadMessage}
            </p>
          )}
        </div>
      </button>
    </div>
  );
};

export default DocumentUpload;