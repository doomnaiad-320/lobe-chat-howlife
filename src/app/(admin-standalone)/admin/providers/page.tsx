'use client';

import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { createStyles } from 'antd-style';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Eye, EyeOff, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// SDK 类型选项 - 对应 AiProviderSDKEnum
const SDK_TYPE_OPTIONS = [
  { label: 'OpenAI (通用)', value: 'openai' },
  { label: 'NewAPI / OneAPI (Router)', value: 'router' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Azure OpenAI', value: 'azure' },
  { label: 'Azure AI', value: 'azureai' },
  { label: 'Google', value: 'google' },
  { label: 'Bedrock', value: 'bedrock' },
  { label: 'Cloudflare', value: 'cloudflare' },
  { label: 'Ollama', value: 'ollama' },
  { label: 'Huggingface', value: 'huggingface' },
  { label: 'Replicate', value: 'replicate' },
  { label: 'Volcengine (火山引擎)', value: 'volcengine' },
  { label: 'Qwen (通义千问)', value: 'qwen' },
];

const useStyles = createStyles(({ css, token }) => ({
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-block-end: 24px;
  `,
  tableCard: css`
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
}));

interface ProviderData {
  apiKeyMasked: string | null;
  baseUrl: string;
  createdAt: string;
  displayName: string | null;
  enabled: boolean;
  id: number;
  provider: string;
  sdkType: string | null;
  sort: number;
  updatedAt: string;
}

interface ProviderModalState {
  data: ProviderData | null;
  mode: 'create' | 'edit';
  open: boolean;
}

export default function AdminProvidersPage() {
  const { styles } = useStyles();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [providerModal, setProviderModal] = useState<ProviderModalState>({
    data: null,
    mode: 'create',
    open: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/providers');
      const data = await res.json();

      if (data.success) {
        setProviders(data.data);
      } else {
        message.error(data.error || '获取服务商列表失败');
      }
    } catch {
      message.error('获取服务商列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleOpenModal = (mode: 'create' | 'edit', data?: ProviderData) => {
    setProviderModal({ data: data || null, mode, open: true });
    if (mode === 'edit' && data) {
      form.setFieldsValue({
        apiKey: '', // 编辑时不显示原 key，留空表示不修改
        baseUrl: data.baseUrl,
        displayName: data.displayName,
        enabled: data.enabled,
        provider: data.provider,
        sdkType: data.sdkType || 'openai',
        sort: data.sort,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ enabled: true, sdkType: 'openai', sort: 0 });
    }
  };

  const handleCloseModal = () => {
    setProviderModal({ data: null, mode: 'create', open: false });
    form.resetFields();
    setShowApiKey(false);
  };

  const handleSubmit = async (values: {
    apiKey: string;
    baseUrl: string;
    displayName: string;
    enabled: boolean;
    provider: string;
    sdkType: string;
    sort: number;
  }) => {
    try {
      const isEdit = providerModal.mode === 'edit';
      const url = isEdit
        ? `/api/admin/providers/${providerModal.data?.id}`
        : '/api/admin/providers';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        body: JSON.stringify(values),
        headers: { 'Content-Type': 'application/json' },
        method,
      });

      const data = await res.json();

      if (data.success) {
        message.success(isEdit ? '更新成功' : '添加成功');
        handleCloseModal();
        fetchProviders();
      } else {
        message.error(data.error || '操作失败');
      }
    } catch {
      message.error('网络错误');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/providers/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        message.success('删除成功');
        fetchProviders();
      } else {
        message.error(data.error || '删除失败');
      }
    } catch {
      message.error('网络错误');
    }
  };

  const handleToggleEnabled = async (record: ProviderData) => {
    try {
      const res = await fetch(`/api/admin/providers/${record.id}`, {
        body: JSON.stringify({ enabled: !record.enabled }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      });

      const data = await res.json();

      if (data.success) {
        message.success(record.enabled ? '已禁用' : '已启用');
        fetchProviders();
      } else {
        message.error(data.error || '操作失败');
      }
    } catch {
      message.error('网络错误');
    }
  };

  const columns: ColumnsType<ProviderData> = [
    {
      dataIndex: 'provider',
      key: 'provider',
      render: (provider, record) => (
        <div>
          <Typography.Text strong>{provider}</Typography.Text>
          {record.displayName && (
            <>
              <br />
              <Typography.Text style={{ fontSize: 12 }} type="secondary">
                {record.displayName}
              </Typography.Text>
            </>
          )}
        </div>
      ),
      title: '服务商',
      width: 180,
    },
    {
      dataIndex: 'baseUrl',
      ellipsis: true,
      key: 'baseUrl',
      title: 'Base URL',
      width: 250,
    },
    {
      dataIndex: 'sdkType',
      key: 'sdkType',
      render: (sdkType) => {
        const option = SDK_TYPE_OPTIONS.find((o) => o.value === sdkType);
        return <Tag color="blue">{option?.label || sdkType || 'openai'}</Tag>;
      },
      title: '请求格式',
      width: 150,
    },
    {
      dataIndex: 'apiKeyMasked',
      key: 'apiKey',
      render: (masked) => <Typography.Text code>{masked || '-'}</Typography.Text>,
      title: 'API Key',
      width: 120,
    },
    {
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled) => (enabled ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
      title: '状态',
      width: 80,
    },
    {
      dataIndex: 'sort',
      key: 'sort',
      title: '排序',
      width: 80,
    },
    {
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
      title: '更新时间',
      width: 160,
    },
    {
      fixed: 'right',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<Pencil size={14} />}
            onClick={() => handleOpenModal('edit', record)}
            size="small"
          >
            编辑
          </Button>
          <Button
            onClick={() => handleToggleEnabled(record)}
            size="small"
            type={record.enabled ? 'default' : 'primary'}
          >
            {record.enabled ? '禁用' : '启用'}
          </Button>
          <Popconfirm
            cancelText="取消"
            okText="确认"
            onConfirm={() => handleDelete(record.id)}
            title="确定要删除该服务商吗？"
          >
            <Button danger icon={<Trash2 size={14} />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
      title: '操作',
      width: 220,
    },
  ];

  return (
    <div>
      <div className={styles.header}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          服务商管理
        </Typography.Title>
        <Space>
          <Button icon={<RefreshCw size={14} />} onClick={fetchProviders}>
            刷新
          </Button>
          <Button
            icon={<Plus size={14} />}
            onClick={() => handleOpenModal('create')}
            type="primary"
          >
            添加服务商
          </Button>
        </Space>
      </div>

      <Card className={styles.tableCard}>
        <Table
          columns={columns}
          dataSource={providers}
          loading={loading}
          pagination={false}
          rowKey="id"
          scroll={{ x: 1100 }}
          size="middle"
        />
      </Card>

      {/* Provider Modal */}
      <Modal
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        open={providerModal.open}
        title={providerModal.mode === 'create' ? '添加服务商' : '编辑服务商'}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="服务商 ID"
            name="provider"
            rules={[{ message: '请输入服务商 ID', required: true }]}
            tooltip="例如: openai, anthropic, custom-xxx"
          >
            <Input disabled={providerModal.mode === 'edit'} placeholder="openai" />
          </Form.Item>

          <Form.Item label="显示名称" name="displayName">
            <Input placeholder="OpenAI" />
          </Form.Item>

          <Form.Item
            label="Base URL"
            name="baseUrl"
            rules={[{ message: '请输入 Base URL', required: true }]}
          >
            <Input placeholder="https://api.openai.com/v1" />
          </Form.Item>

          <Form.Item
            label="API Key"
            name="apiKey"
            rules={
              providerModal.mode === 'create'
                ? [{ message: '请输入 API Key', required: true }]
                : undefined
            }
            tooltip={providerModal.mode === 'edit' ? '留空表示不修改' : undefined}
          >
            <Input.Password
              iconRender={(visible) => (visible ? <Eye size={16} /> : <EyeOff size={16} />)}
              placeholder={providerModal.mode === 'edit' ? '留空表示不修改' : 'sk-xxx'}
            />
          </Form.Item>

          <Form.Item
            label="请求格式 (SDK Type)"
            name="sdkType"
            rules={[{ message: '请选择请求格式', required: true }]}
            tooltip="选择与服务商兼容的请求格式。NewAPI/OneAPI 请选择 Router"
          >
            <Select options={SDK_TYPE_OPTIONS} placeholder="选择请求格式" />
          </Form.Item>

          <Form.Item label="排序" name="sort">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="启用状态" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
