'use client';

import {
  App,
  Button,
  Card,
  Checkbox,
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
  Tooltip,
  Typography,
} from 'antd';
import { createStyles } from 'antd-style';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  Brain,
  CloudDownload,
  Download,
  Eye,
  Image,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Video,
  Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const useStyles = createStyles(({ css, token }) => ({
  abilityTag: css`
    display: inline-flex;
    gap: 4px;
    align-items: center;
  `,
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

interface ModelData {
  abilityFunctionCall: boolean;
  abilityImageOutput: boolean;
  abilityReasoning: boolean;
  abilitySearch: boolean;
  abilityVideo: boolean;
  abilityVision: boolean;
  contextWindowTokens: number | null;
  createdAt: string;
  description: string | null;
  displayName: string | null;
  enabled: boolean;
  id: number;
  inputPrice: number | null;
  isCustom: boolean;
  maxOutputTokens: number | null;
  modelId: string;
  multiplier: number;
  outputPrice: number | null;
  provider: string;
  providerDisplayName: string;
  sort: number;
  type: string;
  updatedAt: string;
}

interface ProviderData {
  displayName: string | null;
  enabled: boolean;
  id: number;
  provider: string;
}

interface SyncProviderData {
  count: number;
  providerId: string;
}

interface ModelModalState {
  data: ModelData | null;
  mode: 'create' | 'edit';
  open: boolean;
}

export default function AdminModelsPage() {
  const { styles } = useStyles();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ModelData[]>([]);
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [modelModal, setModelModal] = useState<ModelModalState>({
    data: null,
    mode: 'create',
    open: false,
  });
  const [syncModal, setSyncModal] = useState(false);
  const [syncProviders, setSyncProviders] = useState<SyncProviderData[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [selectedSyncProvider, setSelectedSyncProvider] = useState<string>('');
  const [syncOverwrite, setSyncOverwrite] = useState(false);
  const [filterProvider, setFilterProvider] = useState<string>('');

  // 远程获取模型相关状态
  const [fetchRemoteModal, setFetchRemoteModal] = useState(false);
  const [fetchRemoteLoading, setFetchRemoteLoading] = useState(false);
  const [selectedFetchProvider, setSelectedFetchProvider] = useState<string>('');
  const [remoteModels, setRemoteModels] = useState<any[]>([]);
  const [selectedRemoteModels, setSelectedRemoteModels] = useState<string[]>([]);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/models');
      const data = await res.json();

      if (data.success) {
        setModels(data.data);
      } else {
        message.error(data.error || '获取模型列表失败');
      }
    } catch {
      message.error('获取模型列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/providers');
      const data = await res.json();

      if (data.success) {
        setProviders(data.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchSyncProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/models/sync');
      const data = await res.json();

      if (data.success) {
        setSyncProviders(data.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchModels();
    fetchProviders();
  }, [fetchModels, fetchProviders]);

  const handleOpenModal = (mode: 'create' | 'edit', data?: ModelData) => {
    setModelModal({ data: data || null, mode, open: true });
    if (mode === 'edit' && data) {
      form.setFieldsValue({
        abilityFunctionCall: data.abilityFunctionCall,
        abilityImageOutput: data.abilityImageOutput,
        abilityReasoning: data.abilityReasoning,
        abilitySearch: data.abilitySearch,
        abilityVideo: data.abilityVideo,
        abilityVision: data.abilityVision,
        contextWindowTokens: data.contextWindowTokens,
        description: data.description,
        displayName: data.displayName,
        enabled: data.enabled,
        inputPrice: data.inputPrice,
        maxOutputTokens: data.maxOutputTokens,
        modelId: data.modelId,
        multiplier: data.multiplier,
        outputPrice: data.outputPrice,
        provider: data.provider,
        sort: data.sort,
        type: data.type,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        abilityFunctionCall: false,
        abilityImageOutput: false,
        abilityReasoning: false,
        abilitySearch: false,
        abilityVideo: false,
        abilityVision: false,
        enabled: true,
        multiplier: 1,
        sort: 0,
        type: 'chat',
      });
    }
  };

  const handleCloseModal = () => {
    setModelModal({ data: null, mode: 'create', open: false });
    form.resetFields();
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const isEdit = modelModal.mode === 'edit';
      const url = isEdit ? `/api/admin/models/${modelModal.data?.id}` : '/api/admin/models';
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
        fetchModels();
      } else {
        message.error(data.error || '操作失败');
      }
    } catch {
      message.error('网络错误');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/models/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        message.success('删除成功');
        fetchModels();
      } else {
        message.error(data.error || '删除失败');
      }
    } catch {
      message.error('网络错误');
    }
  };

  const handleToggleEnabled = async (record: ModelData) => {
    try {
      const res = await fetch(`/api/admin/models/${record.id}`, {
        body: JSON.stringify({ enabled: !record.enabled }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      });

      const data = await res.json();

      if (data.success) {
        message.success(record.enabled ? '已禁用' : '已启用');
        fetchModels();
      } else {
        message.error(data.error || '操作失败');
      }
    } catch {
      message.error('网络错误');
    }
  };

  const handleOpenSyncModal = () => {
    fetchSyncProviders();
    setSyncModal(true);
    setSelectedSyncProvider('');
    setSyncOverwrite(false);
  };

  const handleSync = async () => {
    if (!selectedSyncProvider) {
      message.warning('请选择服务商');
      return;
    }

    setSyncLoading(true);
    try {
      const res = await fetch('/api/admin/models/sync', {
        body: JSON.stringify({ overwrite: syncOverwrite, provider: selectedSyncProvider }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        message.success(data.message);
        setSyncModal(false);
        fetchModels();
      } else {
        message.error(data.error || '同步失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setSyncLoading(false);
    }
  };

  // 从远程获取模型列表
  const handleFetchRemoteModels = async () => {
    if (!selectedFetchProvider) {
      message.warning('请选择服务商');
      return;
    }

    setFetchRemoteLoading(true);
    setRemoteModels([]);
    setSelectedRemoteModels([]);

    try {
      const res = await fetch('/api/admin/models/fetch', {
        body: JSON.stringify({ provider: selectedFetchProvider }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        setRemoteModels(data.data);
        message.success(data.message);
      } else {
        message.error(data.error || '获取模型列表失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setFetchRemoteLoading(false);
    }
  };

  // 导入选中的远程模型
  const handleImportRemoteModels = async () => {
    if (selectedRemoteModels.length === 0) {
      message.warning('请选择要导入的模型');
      return;
    }

    setFetchRemoteLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const modelId of selectedRemoteModels) {
      const model = remoteModels.find((m) => m.id === modelId);
      if (!model) continue;

      try {
        const res = await fetch('/api/admin/models', {
          body: JSON.stringify({
            abilityFunctionCall: model.abilities?.functionCall || false,
            abilityImageOutput: model.abilities?.imageOutput || false,
            abilityReasoning: model.abilities?.reasoning || false,
            abilitySearch: model.abilities?.search || false,
            abilityVideo: model.abilities?.video || false,
            abilityVision: model.abilities?.vision || false,
            contextWindowTokens: model.contextWindowTokens,
            description: model.description,
            displayName: model.displayName,
            enabled: true,
            inputPrice: model.pricing?.input,
            maxOutputTokens: model.maxOutput,
            modelId: model.id,
            multiplier: 1,
            outputPrice: model.pricing?.output,
            provider: selectedFetchProvider,
            sort: 0,
            type: model.type || 'chat',
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });

        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setFetchRemoteLoading(false);

    if (successCount > 0) {
      message.success(
        `成功导入 ${successCount} 个模型${failCount > 0 ? `，${failCount} 个失败` : ''}`,
      );
      fetchModels();
      setFetchRemoteModal(false);
    } else {
      message.error('导入失败');
    }
  };

  const filteredModels = filterProvider
    ? models.filter((m) => m.provider === filterProvider)
    : models;

  const columns: ColumnsType<ModelData> = [
    {
      dataIndex: 'modelId',
      fixed: 'left',
      key: 'modelId',
      render: (modelId, record) => (
        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>
            {modelId}
          </Typography.Text>
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
      title: '模型 ID',
      width: 200,
    },
    {
      dataIndex: 'provider',
      key: 'provider',
      render: (provider, record) => <Tag>{record.providerDisplayName || provider}</Tag>,
      title: '服务商',
      width: 120,
    },
    {
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap: Record<string, { color: string; label: string }> = {
          chat: { color: 'blue', label: '对话' },
          embedding: { color: 'purple', label: '嵌入' },
          image: { color: 'orange', label: '图像' },
          realtime: { color: 'cyan', label: '实时' },
          stt: { color: 'lime', label: '语音识别' },
          text2music: { color: 'pink', label: '文生音乐' },
          text2video: { color: 'volcano', label: '文生视频' },
          tts: { color: 'green', label: '语音合成' },
        };
        const info = typeMap[type] || { color: 'default', label: type };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
      title: '类型',
      width: 90,
    },
    {
      key: 'abilities',
      render: (_, record) => (
        <Space size={4} wrap>
          {record.abilityVision && (
            <Tooltip title="视觉">
              <Tag className={styles.abilityTag} color="blue">
                <Eye size={12} />
              </Tag>
            </Tooltip>
          )}
          {record.abilityFunctionCall && (
            <Tooltip title="函数调用">
              <Tag className={styles.abilityTag} color="purple">
                <Wrench size={12} />
              </Tag>
            </Tooltip>
          )}
          {record.abilityReasoning && (
            <Tooltip title="推理">
              <Tag className={styles.abilityTag} color="orange">
                <Brain size={12} />
              </Tag>
            </Tooltip>
          )}
          {record.abilitySearch && (
            <Tooltip title="搜索">
              <Tag className={styles.abilityTag} color="cyan">
                <Search size={12} />
              </Tag>
            </Tooltip>
          )}
          {record.abilityImageOutput && (
            <Tooltip title="图像输出">
              <Tag className={styles.abilityTag} color="green">
                <Image size={12} />
              </Tag>
            </Tooltip>
          )}
          {record.abilityVideo && (
            <Tooltip title="视频">
              <Tag className={styles.abilityTag} color="magenta">
                <Video size={12} />
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
      title: '能力',
      width: 150,
    },
    {
      dataIndex: 'contextWindowTokens',
      key: 'contextWindowTokens',
      render: (tokens) => (tokens ? `${(tokens / 1000).toFixed(0)}K` : '-'),
      title: '上下文',
      width: 80,
    },
    {
      key: 'pricing',
      render: (_, record) => {
        if (!record.inputPrice && !record.outputPrice) return '-';
        return (
          <div style={{ fontSize: 12 }}>
            {record.inputPrice !== null && <div>输入: ${record.inputPrice}</div>}
            {record.outputPrice !== null && <div>输出: ${record.outputPrice}</div>}
          </div>
        );
      },
      title: '价格 ($/1M)',
      width: 100,
    },
    {
      dataIndex: 'multiplier',
      key: 'multiplier',
      render: (multiplier) => (
        <Tag color={multiplier > 1 ? 'red' : multiplier < 1 ? 'green' : 'default'}>
          {multiplier}x
        </Tag>
      ),
      title: '倍率',
      width: 70,
    },
    {
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled) => (enabled ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
      title: '状态',
      width: 70,
    },
    {
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => (date ? dayjs(date).format('MM-DD HH:mm') : '-'),
      title: '更新时间',
      width: 100,
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
            title="确定要删除该模型吗？"
          >
            <Button danger icon={<Trash2 size={14} />} size="small" />
          </Popconfirm>
        </Space>
      ),
      title: '操作',
      width: 180,
    },
  ];

  return (
    <div>
      <div className={styles.header}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          模型管理
        </Typography.Title>
        <Space>
          <Select
            allowClear
            onChange={setFilterProvider}
            options={providers.map((p) => ({
              label: p.displayName || p.provider,
              value: p.provider,
            }))}
            placeholder="筛选服务商"
            style={{ width: 150 }}
            value={filterProvider || undefined}
          />
          <Button icon={<RefreshCw size={14} />} onClick={fetchModels}>
            刷新
          </Button>
          <Button icon={<CloudDownload size={14} />} onClick={handleOpenSyncModal}>
            内置同步
          </Button>
          <Button
            icon={<Download size={14} />}
            onClick={() => {
              setFetchRemoteModal(true);
              setSelectedFetchProvider('');
              setRemoteModels([]);
              setSelectedRemoteModels([]);
            }}
          >
            远程获取
          </Button>
          <Button
            icon={<Plus size={14} />}
            onClick={() => handleOpenModal('create')}
            type="primary"
          >
            添加模型
          </Button>
        </Space>
      </div>

      <Card className={styles.tableCard}>
        <Table
          columns={columns}
          dataSource={filteredModels}
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          rowKey="id"
          scroll={{ x: 1400 }}
          size="small"
        />
      </Card>

      {/* Model Modal */}
      <Modal
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        open={modelModal.open}
        title={modelModal.mode === 'create' ? '添加模型' : '编辑模型'}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space style={{ display: 'flex', width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item
              label="服务商"
              name="provider"
              rules={[{ message: '请选择服务商', required: true }]}
            >
              <Select
                disabled={modelModal.mode === 'edit'}
                options={providers.map((p) => ({
                  label: p.displayName || p.provider,
                  value: p.provider,
                }))}
                placeholder="选择服务商"
              />
            </Form.Item>

            <Form.Item
              label="模型 ID"
              name="modelId"
              rules={[{ message: '请输入模型 ID', required: true }]}
            >
              <Input disabled={modelModal.mode === 'edit'} placeholder="gpt-4o" />
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex', width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="显示名称" name="displayName">
              <Input placeholder="GPT-4o" />
            </Form.Item>

            <Form.Item label="类型" name="type">
              <Select
                options={[
                  { label: '对话', value: 'chat' },
                  { label: '嵌入', value: 'embedding' },
                  { label: '图像', value: 'image' },
                  { label: '语音合成', value: 'tts' },
                  { label: '语音识别', value: 'stt' },
                  { label: '实时', value: 'realtime' },
                ]}
              />
            </Form.Item>
          </Space>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="模型描述" rows={2} />
          </Form.Item>

          <Space style={{ display: 'flex', width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="上下文长度" name="contextWindowTokens">
              <InputNumber min={0} placeholder="128000" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="最大输出" name="maxOutputTokens">
              <InputNumber min={0} placeholder="4096" style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex', width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="输入价格 ($/1M tokens)" name="inputPrice">
              <InputNumber
                min={0}
                placeholder="2.5"
                precision={6}
                step={0.01}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item label="输出价格 ($/1M tokens)" name="outputPrice">
              <InputNumber
                min={0}
                placeholder="10"
                precision={6}
                step={0.01}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item label="价格倍率" name="multiplier">
              <InputNumber
                min={0.01}
                placeholder="1"
                precision={2}
                step={0.1}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Space>

          <Form.Item label="模型能力">
            <Space wrap>
              <Form.Item name="abilityVision" noStyle valuePropName="checked">
                <Checkbox>视觉</Checkbox>
              </Form.Item>
              <Form.Item name="abilityFunctionCall" noStyle valuePropName="checked">
                <Checkbox>函数调用</Checkbox>
              </Form.Item>
              <Form.Item name="abilityReasoning" noStyle valuePropName="checked">
                <Checkbox>推理</Checkbox>
              </Form.Item>
              <Form.Item name="abilitySearch" noStyle valuePropName="checked">
                <Checkbox>搜索</Checkbox>
              </Form.Item>
              <Form.Item name="abilityImageOutput" noStyle valuePropName="checked">
                <Checkbox>图像输出</Checkbox>
              </Form.Item>
              <Form.Item name="abilityVideo" noStyle valuePropName="checked">
                <Checkbox>视频</Checkbox>
              </Form.Item>
            </Space>
          </Form.Item>

          <Space style={{ display: 'flex', width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="排序" name="sort">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="启用状态" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Sync Modal */}
      <Modal
        confirmLoading={syncLoading}
        onCancel={() => setSyncModal(false)}
        onOk={handleSync}
        open={syncModal}
        title="从内置模型库同步"
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">
            选择已添加的服务商，从内置模型库同步该服务商的模型配置。
          </Typography.Text>
        </div>

        <Form layout="vertical">
          <Form.Item label="选择服务商" required>
            <Select
              onChange={setSelectedSyncProvider}
              options={providers
                .filter((p) => p.enabled)
                .map((p) => {
                  const syncInfo = syncProviders.find((s) => s.providerId === p.provider);
                  return {
                    label: `${p.displayName || p.provider} ${syncInfo ? `(${syncInfo.count} 个模型)` : ''}`,
                    value: p.provider,
                  };
                })}
              placeholder="选择要同步的服务商"
              style={{ width: '100%' }}
              value={selectedSyncProvider || undefined}
            />
          </Form.Item>

          <Form.Item>
            <Checkbox checked={syncOverwrite} onChange={(e) => setSyncOverwrite(e.target.checked)}>
              覆盖已存在的模型配置
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* Fetch Remote Models Modal */}
      <Modal
        footer={[
          <Button key="cancel" onClick={() => setFetchRemoteModal(false)}>
            取消
          </Button>,
          <Button
            disabled={!selectedFetchProvider}
            key="fetch"
            loading={fetchRemoteLoading}
            onClick={handleFetchRemoteModels}
          >
            获取模型列表
          </Button>,
          <Button
            disabled={selectedRemoteModels.length === 0}
            key="import"
            loading={fetchRemoteLoading}
            onClick={handleImportRemoteModels}
            type="primary"
          >
            导入选中 ({selectedRemoteModels.length})
          </Button>,
        ]}
        onCancel={() => setFetchRemoteModal(false)}
        open={fetchRemoteModal}
        title="从远程服务商获取模型"
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">
            选择已配置的服务商，通过 API 获取该服务商支持的模型列表，然后选择要导入的模型。
          </Typography.Text>
        </div>

        <Form layout="vertical">
          <Form.Item label="选择服务商" required>
            <Select
              onChange={(value) => {
                setSelectedFetchProvider(value);
                setRemoteModels([]);
                setSelectedRemoteModels([]);
              }}
              options={providers
                .filter((p) => p.enabled)
                .map((p) => ({
                  label: p.displayName || p.provider,
                  value: p.provider,
                }))}
              placeholder="选择要获取模型的服务商"
              style={{ width: '100%' }}
              value={selectedFetchProvider || undefined}
            />
          </Form.Item>
        </Form>

        {remoteModels.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <Typography.Text strong>
                获取到 {remoteModels.length} 个模型，请选择要导入的模型：
              </Typography.Text>
              <Button
                onClick={() => {
                  if (selectedRemoteModels.length === remoteModels.length) {
                    setSelectedRemoteModels([]);
                  } else {
                    setSelectedRemoteModels(remoteModels.map((m) => m.id));
                  }
                }}
                size="small"
                style={{ marginLeft: 8 }}
                type="link"
              >
                {selectedRemoteModels.length === remoteModels.length ? '取消全选' : '全选'}
              </Button>
            </div>
            <div
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                maxHeight: 400,
                overflow: 'auto',
                padding: 8,
              }}
            >
              <Checkbox.Group
                onChange={(values) => setSelectedRemoteModels(values as string[])}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                value={selectedRemoteModels}
              >
                {remoteModels.map((model) => (
                  <Checkbox key={model.id} value={model.id}>
                    <Space>
                      <Typography.Text strong>{model.id}</Typography.Text>
                      {model.displayName && model.displayName !== model.id && (
                        <Typography.Text type="secondary">({model.displayName})</Typography.Text>
                      )}
                      <Tag color="blue">{model.type || 'chat'}</Tag>
                      {model.contextWindowTokens && (
                        <Tag>{(model.contextWindowTokens / 1000).toFixed(0)}K</Tag>
                      )}
                    </Space>
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
