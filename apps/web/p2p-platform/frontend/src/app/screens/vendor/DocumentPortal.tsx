import React, { useState, useEffect, useRef } from 'react';
import { Card, Progress, message, Spin, Button, Upload, Alert } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { getApiUrl } from '../../api/api';

const API_URL = getApiUrl();

interface DocumentStatus {
  uploaded: boolean;
  url: string | null;
  required: boolean;
  label: string;
}

interface DocumentsData {
  vendor_id: number;
  restaurant_name: string;
  documents: Record<string, DocumentStatus>;
  all_required_complete: boolean;
  onboarding_status: string;
}

const DocumentPortal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [documentsData, setDocumentsData] = useState<DocumentsData | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDocType, setPendingDocType] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view your documents');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/vendor/my-documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied. This page is only for vendor accounts.');
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Failed to load documents');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setDocumentsData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (docType: string, file: File) => {
    setUploadingDoc(docType);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);

      const response = await fetch(`${API_URL}/api/vendor/my-documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload document');
      }

      message.success('Document uploaded successfully!');
      fetchDocuments(); // Refresh the list
    } catch (error: any) {
      message.error(error.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
      setPendingDocType(null);
    }
  };

  const triggerFileUpload = (docType: string) => {
    setPendingDocType(docType);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingDocType) {
      handleUpload(pendingDocType, file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchDocuments}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (!documentsData) {
    return null;
  }

  const requiredDocs = Object.entries(documentsData.documents).filter(([_, doc]) => doc.required);
  const uploadedRequired = requiredDocs.filter(([_, doc]) => doc.uploaded).length;
  const progress = Math.round((uploadedRequired / requiredDocs.length) * 100);

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
      />

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <SafetyCertificateOutlined style={{ fontSize: 48, color: '#1890ff' }} />
        <h1 style={{ marginTop: 16 }}>Document Portal</h1>
        <p style={{ color: '#666' }}>
          {documentsData.restaurant_name}
        </p>
      </div>

      {/* Status Card */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0 }}>Application Status</h3>
            <p style={{ margin: 0, color: '#666', textTransform: 'capitalize' }}>
              {documentsData.onboarding_status.replace('_', ' ')}
            </p>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchDocuments}>
            Refresh
          </Button>
        </div>

        <Progress
          percent={progress}
          status={documentsData.all_required_complete ? 'success' : 'active'}
          format={() => `${uploadedRequired}/${requiredDocs.length} Required Documents`}
        />

        {documentsData.all_required_complete ? (
          <Alert
            message="All Required Documents Uploaded"
            description="Your documents are under review. We'll notify you once your application is approved."
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        ) : (
          <Alert
            message="Documents Required"
            description="Please upload all required documents to complete your application."
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Required Documents */}
      <Card title="Required Documents" style={{ marginBottom: 24 }}>
        {Object.entries(documentsData.documents)
          .filter(([_, doc]) => doc.required)
          .map(([key, doc]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {doc.uploaded ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                )}
                <div>
                  <div style={{ fontWeight: 500 }}>{doc.label}</div>
                  <div style={{ fontSize: 12, color: doc.uploaded ? '#52c41a' : '#ff4d4f' }}>
                    {doc.uploaded ? 'Uploaded' : 'Required - Please upload'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {doc.uploaded && doc.url && (
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => window.open(`${API_URL}${doc.url}`, '_blank')}
                  >
                    View
                  </Button>
                )}
                <Button
                  type={doc.uploaded ? 'default' : 'primary'}
                  icon={uploadingDoc === key ? <Spin size="small" /> : <UploadOutlined />}
                  onClick={() => triggerFileUpload(key)}
                  disabled={uploadingDoc !== null}
                >
                  {doc.uploaded ? 'Replace' : 'Upload'}
                </Button>
              </div>
            </div>
          ))}
      </Card>

      {/* Optional Documents */}
      <Card title="Optional Documents">
        {Object.entries(documentsData.documents)
          .filter(([_, doc]) => !doc.required)
          .map(([key, doc]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {doc.uploaded ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                ) : (
                  <FileTextOutlined style={{ color: '#999', fontSize: 20 }} />
                )}
                <div>
                  <div style={{ fontWeight: 500 }}>{doc.label}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {doc.uploaded ? 'Uploaded' : 'Optional'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {doc.uploaded && doc.url && (
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => window.open(`${API_URL}${doc.url}`, '_blank')}
                  >
                    View
                  </Button>
                )}
                <Button
                  icon={uploadingDoc === key ? <Spin size="small" /> : <UploadOutlined />}
                  onClick={() => triggerFileUpload(key)}
                  disabled={uploadingDoc !== null}
                >
                  {doc.uploaded ? 'Replace' : 'Upload'}
                </Button>
              </div>
            </div>
          ))}
      </Card>

      <div style={{ textAlign: 'center', marginTop: 24, color: '#666', fontSize: 14 }}>
        <p>Need help? Contact our support team for assistance.</p>
      </div>
    </div>
  );
};

export default DocumentPortal;
