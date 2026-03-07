import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, message, Spin } from 'antd';
import { Send, Save } from 'lucide-react';
import api from '../../api/api';

const { TextArea } = Input;

interface ProjectCaseOption {
  case_id: string;
  name: string;
}

interface DepartmentOption {
  id: number;
  name: string;
}

interface RequiredField {
  id: number;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  options_json: string | null;
  sort_order: number;
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
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [requiredFields, setRequiredFields] = useState<RequiredField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  useEffect(() => {
    fetchCases();
    fetchDepartments();
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

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      setDepartments((res.data || []).map((d: { id: number; name: string }) => ({
        id: d.id,
        name: d.name,
      })));
    } catch {
      // Not blocking
    }
  };

  const fetchRequiredFields = async (deptId: number) => {
    setLoadingFields(true);
    try {
      const res = await api.get(`/admin/departments/${deptId}/required-fields`);
      setRequiredFields(res.data || []);
    } catch {
      setRequiredFields([]);
    } finally {
      setLoadingFields(false);
    }
  };

  const handleDepartmentChange = (deptId: number | undefined) => {
    if (deptId) {
      fetchRequiredFields(deptId);
    } else {
      setRequiredFields([]);
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

      // Collect custom fields
      const customFields: Record<string, string> = {};
      for (const f of requiredFields) {
        const val = values[`custom_${f.field_name}`];
        if (val) customFields[f.field_name] = val;
      }

      const payload: Record<string, unknown> = {
        title: values.title,
        description: values.description || null,
        change_type: values.change_type || 'code',
        priority: values.priority || 'Medium',
        case_ids: values.case_ids || [],
        requested_by: getAdminEmail(),
      };

      if (values.department_id) {
        payload.department_id = values.department_id;
      }

      if (Object.keys(customFields).length > 0) {
        payload.custom_fields = customFields;
      }

      const res = await api.post('/admin/change-requests/', payload);
      const cr = res.data;

      if (submitAfterCreate && cr.cr_id) {
        await api.post(`/admin/change-requests/${cr.cr_id}/submit`);
        message.success(`Change request ${cr.cr_id} submitted for review`);
      } else {
        message.success(`Change request ${cr.cr_id} saved as draft`);
      }

      form.resetFields();
      setRequiredFields([]);
      onSuccess?.();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create change request';
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderCustomField = (field: RequiredField) => {
    const name = `custom_${field.field_name}`;
    const rules = field.is_required ? [{ required: true, message: `${field.field_label} is required` }] : [];

    if (field.field_type === 'textarea') {
      return (
        <Form.Item key={name} name={name} label={field.field_label} rules={rules}>
          <TextArea rows={3} placeholder={field.field_label} />
        </Form.Item>
      );
    }

    if (field.field_type === 'url') {
      return (
        <Form.Item key={name} name={name} label={field.field_label} rules={[
          ...rules,
          { type: 'url', message: 'Please enter a valid URL' },
        ]}>
          <Input placeholder="https://..." />
        </Form.Item>
      );
    }

    if (field.field_type === 'select' && field.options_json) {
      let options: string[] = [];
      try { options = JSON.parse(field.options_json); } catch { /* ignore */ }
      return (
        <Form.Item key={name} name={name} label={field.field_label} rules={rules}>
          <Select
            placeholder={`Select ${field.field_label}`}
            options={options.map((o) => ({ value: o, label: o }))}
          />
        </Form.Item>
      );
    }

    return (
      <Form.Item key={name} name={name} label={field.field_label} rules={rules}>
        <Input placeholder={field.field_label} />
      </Form.Item>
    );
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

        <Form.Item name="department_id" label="Department">
          <Select
            placeholder="Select department"
            allowClear
            onChange={handleDepartmentChange}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
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

        {/* Department-specific required fields */}
        {loadingFields && <Spin size="small" style={{ marginBottom: 16 }} />}
        {requiredFields.length > 0 && (
          <div style={{
            padding: 16, background: '#f6f8fa', borderRadius: 8, marginBottom: 16,
            border: '1px solid #e8e8e8',
          }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 12, fontWeight: 600 }}>
              Department-Specific Fields
            </div>
            {requiredFields.map(renderCustomField)}
          </div>
        )}

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
