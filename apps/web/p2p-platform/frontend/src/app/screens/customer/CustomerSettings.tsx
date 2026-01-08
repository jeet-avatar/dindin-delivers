import React, { useState } from 'react';
import { Card, Switch, Button, Typography, Modal, Input, message } from 'antd';
import {
  ArrowLeftOutlined,
  BellOutlined,
  MailOutlined,
  GlobalOutlined,
  LockOutlined,
  FileTextOutlined,
  BugOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  RightOutlined,
  LoadingOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import { DollorTheme } from '../../theme';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * CustomerSettings - App settings and preferences
 * Matches iOS SettingsView.swift for platform parity
 */

const APP_VERSION = '1.0.0';

// Setting Row Component - Toggle Version
interface SettingsToggleRowProps {
  icon: React.ReactNode;
  title: string;
  isOn: boolean;
  onToggle: (value: boolean) => void;
}

const SettingsToggleRow: React.FC<SettingsToggleRowProps> = ({ icon, title, isOn, onToggle }) => (
  <div className="settings-row">
    <div className="row-left">
      <span className="row-icon">{icon}</span>
      <Text className="row-title">{title}</Text>
    </div>
    <Switch
      checked={isOn}
      onChange={onToggle}
      style={{ backgroundColor: isOn ? DollorTheme.Brand.orange : undefined }}
    />
  </div>
);

// Setting Row Component - Navigation Version
interface SettingsNavRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  danger?: boolean;
  loading?: boolean;
}

const SettingsNavRow: React.FC<SettingsNavRowProps> = ({
  icon, title, subtitle, onClick, danger, loading
}) => (
  <div
    className={`settings-row clickable ${danger ? 'danger' : ''}`}
    onClick={onClick}
  >
    <div className="row-left">
      <span className={`row-icon ${danger ? 'danger-icon' : ''}`}>
        {loading ? <LoadingOutlined /> : icon}
      </span>
      <Text className={danger ? 'danger-text' : ''}>{title}</Text>
    </div>
    <div className="row-right">
      {subtitle && <Text type="secondary" className="row-subtitle">{subtitle}</Text>}
      <RightOutlined className={`chevron ${danger ? 'danger-chevron' : ''}`} />
    </div>
  </div>
);

// Setting Row Component - Info Version
interface SettingsInfoRowProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

const SettingsInfoRow: React.FC<SettingsInfoRowProps> = ({ icon, title, value }) => (
  <div className="settings-row">
    <div className="row-left">
      <span className="row-icon">{icon}</span>
      <Text>{title}</Text>
    </div>
    <Text type="secondary">{value}</Text>
  </div>
);

const CustomerSettings: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  // Notification settings
  const [pushNotifications, setPushNotifications] = useState(
    localStorage.getItem('push_notifications') !== 'false'
  );
  const [emailNotifications, setEmailNotifications] = useState(
    localStorage.getItem('email_notifications') !== 'false'
  );

  // Language settings
  const [language, setLanguage] = useState(
    localStorage.getItem('app_language') || 'English'
  );
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Bug report
  const [showBugReportModal, setShowBugReportModal] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [submittingBug, setSubmittingBug] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const customerId = localStorage.getItem('customer_id') || localStorage.getItem('p2p_customer_id');

  const availableLanguages = ['English', 'Spanish', 'French', 'Chinese', 'Hindi'];

  const handlePushToggle = (checked: boolean) => {
    setPushNotifications(checked);
    localStorage.setItem('push_notifications', String(checked));
  };

  const handleEmailToggle = (checked: boolean) => {
    setEmailNotifications(checked);
    localStorage.setItem('email_notifications', String(checked));
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);
    setShowLanguageModal(false);
    message.info('Language preference saved. Some changes may require a page refresh.');
  };

  const handleSubmitBugReport = async () => {
    if (!bugDescription.trim()) return;

    setSubmittingBug(true);
    try {
      const token = localStorage.getItem('customer_token') || localStorage.getItem('access_token');
      await axios.post(
        `${API_URL}/api/feedback`,
        {
          customer_id: customerId,
          type: 'bug_report',
          description: bugDescription,
          app_version: APP_VERSION
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      ).catch(() => {});

      message.success('Thank you for your feedback! We\'ll review your report.');
      setBugDescription('');
      setShowBugReportModal(false);
    } catch (error) {
      message.success('Report submitted. Thank you!');
    } finally {
      setSubmittingBug(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!customerId) {
      message.error('Unable to identify account. Please try logging out and back in.');
      return;
    }

    setDeletingAccount(true);
    try {
      const token = localStorage.getItem('customer_token') || localStorage.getItem('access_token');
      await axios.delete(`${API_URL}/api/customers/${customerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const keysToRemove = [
        'customer_id', 'p2p_customer_id', 'customer_name', 'customer_email',
        'customer_token', 'access_token', 'p2p_access_token',
        'saved_addresses', 'favorites', 'cart', 'cart_items'
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));

      message.success('Account deleted successfully');
      navigate('/customer/login');
    } catch (error) {
      message.error('Failed to delete account. Please contact support.');
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="settings-screen">
      {/* Header */}
      <div className="screen-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="back-btn"
        />
        <Title level={4} style={{ margin: 0 }}>Settings</Title>
        <div style={{ width: 40 }} />
      </div>

      <div className="settings-content">
        {/* Notifications Section */}
        <div className="settings-section">
          <Text className="section-title">NOTIFICATIONS</Text>
          <Card className="settings-card" bordered={false}>
            <SettingsToggleRow
              icon={<BellOutlined style={{ color: DollorTheme.Brand.orange }} />}
              title="Push Notifications"
              isOn={pushNotifications}
              onToggle={handlePushToggle}
            />
            <div className="row-divider" />
            <SettingsToggleRow
              icon={<MailOutlined style={{ color: DollorTheme.Brand.orange }} />}
              title="Email Notifications"
              isOn={emailNotifications}
              onToggle={handleEmailToggle}
            />
          </Card>
        </div>

        {/* Preferences Section */}
        <div className="settings-section">
          <Text className="section-title">PREFERENCES</Text>
          <Card className="settings-card" bordered={false}>
            <SettingsNavRow
              icon={<GlobalOutlined style={{ color: DollorTheme.Brand.orange }} />}
              title="Language"
              subtitle={language}
              onClick={() => setShowLanguageModal(true)}
            />
          </Card>
        </div>

        {/* Legal Section */}
        <div className="settings-section">
          <Text className="section-title">LEGAL</Text>
          <Card className="settings-card" bordered={false}>
            <SettingsNavRow
              icon={<LockOutlined style={{ color: DollorTheme.Brand.orange }} />}
              title="Privacy Policy"
              onClick={() => navigate('/customer/privacy-policy')}
            />
            <div className="row-divider" />
            <SettingsNavRow
              icon={<FileTextOutlined style={{ color: DollorTheme.Brand.orange }} />}
              title="Terms & Conditions"
              onClick={() => navigate('/customer/terms')}
            />
          </Card>
        </div>

        {/* Support Section */}
        <div className="settings-section">
          <Text className="section-title">SUPPORT</Text>
          <Card className="settings-card" bordered={false}>
            <SettingsNavRow
              icon={<BugOutlined style={{ color: DollorTheme.Brand.orange }} />}
              title="Report a Bug"
              onClick={() => setShowBugReportModal(true)}
            />
            <div className="row-divider" />
            <SettingsNavRow
              icon={<QuestionCircleOutlined style={{ color: DollorTheme.Brand.orange }} />}
              title="Help Center"
              onClick={() => navigate('/customer/help')}
            />
          </Card>
        </div>

        {/* About Section */}
        <div className="settings-section">
          <Text className="section-title">ABOUT</Text>
          <Card className="settings-card" bordered={false}>
            <SettingsInfoRow
              icon={<InfoCircleOutlined style={{ color: DollorTheme.Brand.orange }} />}
              title="App Version"
              value={APP_VERSION}
            />
          </Card>
        </div>

        {/* Danger Zone Section */}
        <div className="settings-section">
          <Text className="section-title danger-title">DANGER ZONE</Text>
          <Card className="settings-card danger-card" bordered={false}>
            <SettingsNavRow
              icon={<DeleteOutlined />}
              title="Delete Account"
              onClick={() => setShowDeleteModal(true)}
              danger
              loading={deletingAccount}
            />
          </Card>
        </div>
      </div>

      {/* Language Selection Modal */}
      <Modal
        title="Select Language"
        open={showLanguageModal}
        onCancel={() => setShowLanguageModal(false)}
        footer={null}
        className="language-modal"
      >
        <div className="language-list">
          {availableLanguages.map(lang => (
            <div
              key={lang}
              className={`language-item ${lang === language ? 'selected' : ''}`}
              onClick={() => handleLanguageChange(lang)}
            >
              <Text>{lang}</Text>
              {lang === language && (
                <CheckOutlined style={{ color: DollorTheme.Brand.orange, fontSize: 16 }} />
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Bug Report Modal */}
      <Modal
        title="Report a Bug"
        open={showBugReportModal}
        onCancel={() => {
          setShowBugReportModal(false);
          setBugDescription('');
        }}
        footer={[
          <Button key="cancel" onClick={() => setShowBugReportModal(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submittingBug}
            disabled={!bugDescription.trim()}
            onClick={handleSubmitBugReport}
            style={{ background: DollorTheme.Brand.green }}
          >
            Submit Report
          </Button>
        ]}
      >
        <div className="bug-report-form">
          <Text className="form-label">Describe the issue</Text>
          <TextArea
            rows={5}
            placeholder="What you were trying to do, what happened, and any error messages you saw..."
            value={bugDescription}
            onChange={e => setBugDescription(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <Text type="secondary" className="form-hint">
            Include as much detail as possible to help us fix the issue.
          </Text>
        </div>
      </Modal>

      {/* Delete Account Warning Modal */}
      <Modal
        title="Delete Account?"
        open={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>,
          <Button
            key="continue"
            danger
            onClick={() => {
              setShowDeleteModal(false);
              setShowDeleteConfirm(true);
            }}
          >
            Continue
          </Button>
        ]}
      >
        <Paragraph>
          This will permanently delete your account, including all your order history,
          saved addresses, and payment methods.
        </Paragraph>
        <Text strong type="danger">This action cannot be undone.</Text>
      </Modal>

      {/* Delete Account Final Confirmation Modal */}
      <Modal
        title="Final Confirmation"
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>,
          <Button
            key="delete"
            danger
            loading={deletingAccount}
            onClick={handleDeleteAccount}
          >
            Delete Forever
          </Button>
        ]}
      >
        <Text>
          Are you absolutely sure? Your account and all associated data will be permanently deleted.
        </Text>
      </Modal>

      <style>{`
        .settings-screen {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 16px 40px 16px;
          background: ${DollorTheme.Background.primary};
          min-height: 100vh;
        }

        .screen-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          position: sticky;
          top: 0;
          background: ${DollorTheme.Background.primary};
          z-index: 10;
        }

        .back-btn {
          font-size: 18px;
        }

        .settings-content {
          padding-top: 8px;
        }

        .settings-section {
          margin-bottom: 28px;
        }

        .section-title {
          font-size: 11px;
          font-weight: 700;
          color: ${DollorTheme.Text.tertiary};
          letter-spacing: 0.5px;
          display: block;
          margin-left: 4px;
          margin-bottom: 10px;
        }

        .section-title.danger-title {
          color: #ff4d4f;
        }

        .settings-card {
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }

        .settings-card .ant-card-body {
          padding: 0;
        }

        .settings-card.danger-card {
          background: rgba(255, 77, 79, 0.06);
        }

        .settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: #fff;
        }

        .settings-card.danger-card .settings-row {
          background: transparent;
        }

        .settings-row.clickable {
          cursor: pointer;
          transition: background 0.2s;
        }

        .settings-row.clickable:hover {
          background: ${DollorTheme.Background.tertiary};
        }

        .settings-row.clickable.danger:hover {
          background: rgba(255, 77, 79, 0.12);
        }

        .row-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .row-icon {
          font-size: 20px;
          width: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .row-icon.danger-icon {
          color: #ff4d4f;
        }

        .row-title {
          font-size: 15px;
        }

        .danger-text {
          color: #ff4d4f;
        }

        .row-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .row-subtitle {
          font-size: 14px;
        }

        .chevron {
          font-size: 12px;
          color: ${DollorTheme.Text.tertiary};
        }

        .chevron.danger-chevron {
          color: rgba(255, 77, 79, 0.5);
        }

        .row-divider {
          height: 1px;
          background: ${DollorTheme.Border.light};
          margin-left: 62px;
        }

        /* Language Modal */
        .language-list {
          margin: -12px -24px;
        }

        .language-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .language-item:hover {
          background: ${DollorTheme.Background.secondary};
        }

        .language-item.selected {
          background: ${DollorTheme.Background.tertiary};
        }

        /* Bug Report Form */
        .bug-report-form {
          padding: 8px 0;
        }

        .form-label {
          font-weight: 500;
          display: block;
        }

        .form-hint {
          display: block;
          font-size: 12px;
          margin-top: 12px;
        }

        @media (max-width: 576px) {
          .screen-header {
            padding: 12px 0;
          }

          .settings-row {
            padding: 14px 16px;
          }

          .row-divider {
            margin-left: 54px;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerSettings;
