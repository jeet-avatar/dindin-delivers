import React, { useState, useEffect, useRef } from 'react';
import { Card, Upload, Button, Table, Tag, Space, Modal, message, Descriptions, Progress, Spin } from 'antd';
import { UploadOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EyeOutlined, DeleteOutlined, DownloadOutlined, CameraOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { useUser } from '../../context/UserContext';
import { getApiUrl } from '../../api/api';

// Use centralized API config - supports local, staging, and production
const API_URL = getApiUrl();

interface Document {
  id: number;
  document_type: string;
  file_name: string;
  file_url: string;
  upload_date: string;
  expiry_date?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
}

const DOCUMENT_TYPES = [
  {
    type: 'w9_form',
    label: 'W-9 Tax Form',
    description: 'IRS Form W-9 for tax reporting',
    required: true
  },
  {
    type: 'business_license',
    label: 'Business License',
    description: 'State or local business operating license',
    required: true
  },
  {
    type: 'food_handler',
    label: 'Food Handler Certificate',
    description: 'Food safety and handling certification',
    required: true,
    hasExpiry: true
  },
  {
    type: 'health_permit',
    label: 'Health Permit',
    description: 'Department of Health operating permit',
    required: true,
    hasExpiry: true
  },
  {
    type: 'liability_insurance',
    label: 'Liability Insurance',
    description: 'General liability insurance certificate',
    required: true,
    hasExpiry: true
  },
  {
    type: 'menu',
    label: 'Menu',
    description: 'Current menu with prices',
    required: false
  }
];

const VendorDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [viewModal, setViewModal] = useState<{ visible: boolean; document: Document | null }>({
    visible: false,
    document: null
  });
  const [cameraDocType, setCameraDocType] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();

  // Get vendor_id from logged-in user context
  const vendorId = user?.vendor_id;

  useEffect(() => {
    if (vendorId) {
      fetchDocuments();
    }
  }, [vendorId]);

  const fetchDocuments = async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/vendors/${vendorId}/documents`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setDocuments(response.data.documents || response.data || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      // Don't show error message for 404/405 - documents endpoint may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File, documentType: string) => {
    if (!vendorId) {
      message.error('Please log in to upload documents');
      return false;
    }
    setUploadingType(documentType);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/vendors/${vendorId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      message.success('Document uploaded successfully');
      fetchDocuments();
    } catch (error) {
      message.error('Failed to upload document');
      console.error('Upload error:', error);
    } finally {
      setUploadingType(null);
    }

    return false; // Prevent default upload behavior
  };

  const handleDelete = async (documentId: number) => {
    if (!vendorId) return;
    Modal.confirm({
      title: 'Delete Document',
      content: 'Are you sure you want to delete this document?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_URL}/api/vendors/${vendorId}/documents/${documentId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          message.success('Document deleted');
          fetchDocuments();
        } catch (error) {
          message.error('Failed to delete document');
        }
      }
    });
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && cameraDocType) {
      handleUpload(file, cameraDocType);
    }
    // Reset input so the same file can be re-selected
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    setCameraDocType(null);
  };

  const triggerCamera = (docType: string) => {
    setCameraDocType(docType);
    cameraInputRef.current?.click();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'rejected':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      approved: 'success',
      pending: 'warning',
      rejected: 'error'
    };
    return <Tag color={colors[status]} icon={getStatusIcon(status)}>{status.toUpperCase()}</Tag>;
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = moment(expiryDate).diff(moment(), 'days');
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return moment(expiryDate).isBefore(moment());
  };

  const calculateCompletionRate = () => {
    const requiredDocs = DOCUMENT_TYPES.filter(d => d.required);
    const uploadedRequired = requiredDocs.filter(docType => 
      documents.some(doc => doc.document_type === docType.type && doc.status === 'approved')
    );
    return Math.round((uploadedRequired.length / requiredDocs.length) * 100);
  };

  const columns = [
    {
      title: 'Document Type',
      dataIndex: 'document_type',
      key: 'document_type',
      render: (type: string) => {
        const docType = DOCUMENT_TYPES.find(d => d.type === type);
        return (
          <div>
            <div><strong>{docType?.label || type}</strong></div>
            <div style={{ fontSize: '12px', color: '#999' }}>{docType?.description}</div>
          </div>
        );
      }
    },
    {
      title: 'File Name',
      dataIndex: 'file_name',
      key: 'file_name',
      render: (fileName: string) => (
        <Space>
          <FileTextOutlined />
          {fileName}
        </Space>
      )
    },
    {
      title: 'Upload Date',
      dataIndex: 'upload_date',
      key: 'upload_date',
      render: (date: string) => moment(date).format('MMM DD, YYYY')
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (date?: string) => {
        if (!date) return <span style={{ color: '#999' }}>N/A</span>;
        
        if (isExpired(date)) {
          return <Tag color="error">Expired {moment(date).format('MMM DD, YYYY')}</Tag>;
        }
        
        if (isExpiringSoon(date)) {
          return <Tag color="warning">Expires {moment(date).format('MMM DD, YYYY')}</Tag>;
        }
        
        return moment(date).format('MMM DD, YYYY');
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Document) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => setViewModal({ visible: true, document: record })}
          >
            View
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </Space>
      )
    }
  ];

  const completionRate = calculateCompletionRate();

  // Show message if no vendor account
  if (!vendorId) {
    return (
      <div className="vendor-documents" style={{ padding: '24px', textAlign: 'center' }}>
        <h2>No Vendor Account Found</h2>
        <p>Please log in with a vendor account to manage documents.</p>
      </div>
    );
  }

  return (
    <div className="vendor-documents">
      {/* Hidden camera input for mobile photo capture */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleCameraCapture}
        style={{ display: 'none' }}
      />

      <div className="page-header">
        <h1>Documents</h1>
        <div className="completion-badge">
          <Progress
            type="circle"
            percent={completionRate}
            width={60}
            strokeColor={completionRate === 100 ? '#52c41a' : '#1890ff'}
          />
          <span className="completion-text">Compliance</span>
        </div>
      </div>

      {/* Upload Cards */}
      <div className="upload-grid">
        {DOCUMENT_TYPES.map(docType => {
          const existingDoc = documents.find(d => d.document_type === docType.type);
          const isUploading = uploadingType === docType.type;
          
          return (
            <Card
              key={docType.type}
              className={`upload-card ${existingDoc ? 'uploaded' : ''}`}
              title={
                <Space>
                  {docType.label}
                  {docType.required && <Tag color="red">Required</Tag>}
                  {existingDoc && getStatusIcon(existingDoc.status)}
                </Space>
              }
            >
              <p className="doc-description">{docType.description}</p>
              
              {existingDoc ? (
                <div className="existing-doc">
                  <div className="doc-info">
                    <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                    <div>
                      <div className="file-name">{existingDoc.file_name}</div>
                      <div className="upload-date">
                        Uploaded {moment(existingDoc.upload_date).fromNow()}
                      </div>
                    </div>
                  </div>
                  {existingDoc.expiry_date && (
                    <div className="expiry-info">
                      {isExpired(existingDoc.expiry_date) ? (
                        <Tag color="error">Expired - Re-upload Required</Tag>
                      ) : isExpiringSoon(existingDoc.expiry_date) ? (
                        <Tag color="warning">Expiring Soon</Tag>
                      ) : (
                        <span className="expiry-text">
                          Valid until {moment(existingDoc.expiry_date).format('MMM DD, YYYY')}
                        </span>
                      )}
                    </div>
                  )}
                  {existingDoc.status === 'rejected' && existingDoc.admin_notes && (
                    <div className="rejection-notes">
                      <strong>Admin Notes:</strong> {existingDoc.admin_notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-doc">
                  <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                  <p>No document uploaded</p>
                </div>
              )}

              <Upload
                beforeUpload={(file) => handleUpload(file, docType.type)}
                showUploadList={false}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
              >
                <Button
                  type={existingDoc ? 'default' : 'primary'}
                  icon={<UploadOutlined />}
                  loading={isUploading}
                  block
                  style={{ marginTop: 12 }}
                >
                  {existingDoc ? 'Replace Document' : 'Upload Document'}
                </Button>
              </Upload>
              <Button
                icon={<CameraOutlined />}
                onClick={() => triggerCamera(docType.type)}
                loading={isUploading && cameraDocType === docType.type}
                block
                style={{ marginTop: 8 }}
              >
                Take Photo
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Documents Table */}
      <Card title="All Documents" style={{ marginTop: 24 }}>
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title="Document Details"
        open={viewModal.visible}
        onCancel={() => setViewModal({ visible: false, document: null })}
        footer={[
          <Button key="close" onClick={() => setViewModal({ visible: false, document: null })}>
            Close
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => window.open(viewModal.document?.file_url, '_blank')}
          >
            Download
          </Button>
        ]}
        width={700}
      >
        {viewModal.document && (
          <>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Document Type">
                {DOCUMENT_TYPES.find(d => d.type === viewModal.document?.document_type)?.label}
              </Descriptions.Item>
              <Descriptions.Item label="File Name">
                {viewModal.document.file_name}
              </Descriptions.Item>
              <Descriptions.Item label="Upload Date">
                {moment(viewModal.document.upload_date).format('MMMM DD, YYYY HH:mm')}
              </Descriptions.Item>
              {viewModal.document.expiry_date && (
                <Descriptions.Item label="Expiry Date">
                  {moment(viewModal.document.expiry_date).format('MMMM DD, YYYY')}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Status">
                {getStatusTag(viewModal.document.status)}
              </Descriptions.Item>
              {viewModal.document.admin_notes && (
                <Descriptions.Item label="Admin Notes">
                  {viewModal.document.admin_notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            {viewModal.document.file_url && (
              <div className="document-preview">
                {viewModal.document.file_name.endsWith('.pdf') ? (
                  <iframe
                    src={viewModal.document.file_url}
                    style={{ width: '100%', height: 400, border: 'none', marginTop: 16 }}
                    title="Document Preview"
                  />
                ) : (
                  <img
                    src={viewModal.document.file_url}
                    alt="Document"
                    style={{ width: '100%', marginTop: 16 }}
                  />
                )}
              </div>
            )}
          </>
        )}
      </Modal>

      <style>{`
        .vendor-documents {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-header h1 {
          margin: 0;
          font-size: 28px;
        }
        .completion-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .completion-text {
          font-size: 12px;
          color: #666;
        }
        .upload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .upload-card {
          border-radius: 8px;
        }
        .upload-card.uploaded {
          border-color: #52c41a;
        }
        .doc-description {
          font-size: 13px;
          color: #666;
          margin-bottom: 16px;
        }
        .existing-doc {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 12px;
        }
        .doc-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .file-name {
          font-weight: 500;
          margin-bottom: 4px;
        }
        .upload-date {
          font-size: 12px;
          color: #999;
        }
        .expiry-info {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e8e8e8;
        }
        .expiry-text {
          font-size: 13px;
          color: #666;
        }
        .rejection-notes {
          margin-top: 12px;
          padding: 8px;
          background: #fff1f0;
          border: 1px solid #ffccc7;
          border-radius: 4px;
          font-size: 13px;
        }
        .no-doc {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
          color: #999;
        }
        .no-doc p {
          margin: 12px 0 0 0;
        }
      `}</style>
    </div>
  );
};

export default VendorDocuments;
