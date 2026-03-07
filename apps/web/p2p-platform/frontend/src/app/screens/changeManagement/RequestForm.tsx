import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, message, Spin } from 'antd';
import { Send, Save } from 'lucide-react';
import api from '../../api/api';

const { TextArea } = Input;

interface ProjectCaseOption {
  case_id: string;
  name: string;
}

interface RequestFormProps {
  onSuccess?: () => void;
}

const CHANGE_TYPES = [
  { value: 'code', label: 'Code' },
  { value: 'config', label: 'Configuration' },
  { value: 'docs', label: 'Documentation' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'manual', label: 'Manual' },
];

const PRIORITIES = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

const RequestForm: React.FC<RequestFormProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [cases, setCases] = useState<ProjectCaseOption[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const res = await api.get('/admin/project-cases', { params: { page_size: 500 } });
      const items = res.data?.items || res.data || [];
      setCases(items.map((c: { case_id: string; name: string }) => ({
        case_id: c.case_id,
        name: c.name,
      })));
    } catch {
      // Cases might not exist yet; not blocking
    } finally {
      setLoadingCases(false);
    }
  };

  const getAdminEmail = (): string => {
    try {
      const userData = globalThis.localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.email || 'admin@dollor.ai';
      }
    } catch { /* ignore */ }
    return 'admin@dollor.ai';
  };

  const handleSubmit = async (submitAfterCreate: boolean) => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        title: values.title,
        description: values.description || null,
        change_type: values.change_type || 'code',
        priority: values.priority || 'Medium',
        case_ids: values.case_ids || [],
        requested_by: getAdminEmail(),
      };

      const res = await api.post('/admin/change-requests/', payload);
      const cr = res.data;

      if (submitAfterCreate && cr.cr_id) {
        await api.post(`/admin/change-requests/${cr.cr_id}/submit`);
        message.success(`Change request ${cr.cr_id} submitted for review`);
      } else {
        message.success(`Change request ${cr.cr_id} saved as draft`);
      }

      form.resetFields();
      onSuccess?.();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create change request';
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h3 style={{ marginBottom: 24 }}>New Change Request</h3>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ change_type: 'code', priority: 'Medium' }}
      >
        <Form.Item
          name="title"
          label="Title"
          rules={[
            { required: true, message: 'Title is required' },
            { max: 500, message: 'Title must be 500 characters or fewer' },
          ]}
        >
          <Input placeholder="Brief description of the change" maxLength={500} />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <TextArea rows={4} placeholder="Detailed description (optional)" />
        </Form.Item>

        <Form.Item name="change_type" label="Change Type">
          <Select options={CHANGE_TYPES} />
        </Form.Item>

        <Form.Item name="priority" label="Priority">
          <Select options={PRIORITIES} />
        </Form.Item>

        <Form.Item name="case_ids" label="Linked Cases">
          <Select
            mode="multiple"
            placeholder="Search and link project cases"
            loading={loadingCases}
            showSearch
            filterOption={(input, option) =>
              (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
            }
            options={cases.map((c) => ({
              value: c.case_id,
              label: `${c.case_id} - ${c.name}`,
            }))}
            notFoundContent={loadingCases ? <Spin size="small" /> : 'No cases found'}
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              type="primary"
              icon={<Send size={14} />}
              loading={submitting}
              onClick={() => handleSubmit(true)}
            >
              Submit for Review
            </Button>
            <Button
              icon={<Save size={14} />}
              loading={submitting}
              onClick={() => handleSubmit(false)}
            >
              Save as Draft
            </Button>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default RequestForm;
