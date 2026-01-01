'use client';

import {
  App,
  Avatar,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { createStyles } from 'antd-style';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Coins, Minus, Plus, RefreshCw, Search, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const useStyles = createStyles(({ css, token }) => ({
  header: css`
    margin-block-end: 24px;
  `,
  statsRow: css`
    display: flex;
    gap: 16px;
    margin-block-end: 24px;
  `,
  tableCard: css`
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
  toolbar: css`
    display: flex;
    gap: 12px;
    margin-block-end: 16px;
  `,
  icon: css`
    color: ${token.colorTextSecondary};
  `,
}));

interface UserData {
  avatar: string | null;
  balance: number;
  banned: boolean;
  createdAt: string;
  email: string | null;
  fullName: string | null;
  id: string;
  lastActiveAt: string;
  totalRecharged: number;
  totalUsed: number;
  username: string | null;
}

interface BalanceModalState {
  action: 'recharge' | 'deduct' | 'set';
  open: boolean;
  user: UserData | null;
}

export default function AdminUsersPage() {
  const { styles } = useStyles();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [balanceModal, setBalanceModal] = useState<BalanceModalState>({
    action: 'recharge',
    open: false,
    user: null,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();

      if (data.success) {
        setUsers(data.data);
        setTotal(data.total);
      }
    } catch {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, message]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBalanceSubmit = async (values: { amount: number }) => {
    if (!balanceModal.user) return;

    try {
      const res = await fetch(`/api/admin/users/${balanceModal.user.id}/balance`, {
        body: JSON.stringify({
          action: balanceModal.action,
          amount: values.amount,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        message.success('操作成功');
        setBalanceModal({ action: 'recharge', open: false, user: null });
        form.resetFields();
        fetchUsers();
      } else {
        message.error(data.error || '操作失败');
      }
    } catch {
      message.error('网络错误');
    }
  };

  const handleBanUser = async (user: UserData) => {
    modal.confirm({
      content: user.banned ? '确定要解封该用户吗？' : '确定要封禁该用户吗？',
      onOk: async () => {
        try {
          const res = await fetch(`/api/admin/users/${user.id}`, {
            body: JSON.stringify({ banned: !user.banned }),
            headers: { 'Content-Type': 'application/json' },
            method: 'PATCH',
          });

          const data = await res.json();

          if (data.success) {
            message.success(user.banned ? '已解封' : '已封禁');
            fetchUsers();
          } else {
            message.error(data.error || '操作失败');
          }
        } catch {
          message.error('网络错误');
        }
      },
      title: user.banned ? '解封用户' : '封禁用户',
    });
  };

  const columns: ColumnsType<UserData> = [
    {
      dataIndex: 'avatar',
      key: 'avatar',
      render: (avatar, record) => (
        <Avatar src={avatar} style={{ backgroundColor: '#1677ff' }}>
          {(record.username || record.email || 'U')[0].toUpperCase()}
        </Avatar>
      ),
      title: '头像',
      width: 80,
    },
    {
      dataIndex: 'username',
      key: 'username',
      render: (username, record) => (
        <div>
          <Typography.Text strong>{username || '-'}</Typography.Text>
          <br />
          <Typography.Text style={{ fontSize: 12 }} type="secondary">
            {record.email || '-'}
          </Typography.Text>
        </div>
      ),
      title: '用户名 / 邮箱',
    },
    {
      dataIndex: 'balance',
      key: 'balance',
      render: (balance) => (
        <Typography.Text strong style={{ color: balance > 0 ? '#52c41a' : undefined }}>
          ¥{balance.toFixed(2)}
        </Typography.Text>
      ),
      title: '余额',
      width: 120,
    },
    {
      dataIndex: 'totalRecharged',
      key: 'totalRecharged',
      render: (val) => `¥${val.toFixed(2)}`,
      title: '累计充值',
      width: 120,
    },
    {
      dataIndex: 'totalUsed',
      key: 'totalUsed',
      render: (val) => `¥${val.toFixed(2)}`,
      title: '累计消费',
      width: 120,
    },
    {
      dataIndex: 'banned',
      key: 'status',
      render: (banned) => (banned ? <Tag color="red">已封禁</Tag> : <Tag color="green">正常</Tag>),
      title: '状态',
      width: 100,
    },
    {
      dataIndex: 'lastActiveAt',
      key: 'lastActiveAt',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
      title: '最后活跃',
      width: 160,
    },
    {
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
      title: '注册时间',
      width: 120,
    },
    {
      fixed: 'right',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<Plus size={14} />}
            onClick={() => setBalanceModal({ action: 'recharge', open: true, user: record })}
            size="small"
            type="primary"
          >
            充值
          </Button>
          <Button
            icon={<Minus size={14} />}
            onClick={() => setBalanceModal({ action: 'deduct', open: true, user: record })}
            size="small"
          >
            扣减
          </Button>
          <Button
            danger={!record.banned}
            onClick={() => handleBanUser(record)}
            size="small"
            type={record.banned ? 'default' : 'primary'}
          >
            {record.banned ? '解封' : '封禁'}
          </Button>
        </Space>
      ),
      title: '操作',
      width: 240,
    },
  ];

  // 统计数据
  const totalBalance = users.reduce((sum, u) => sum + u.balance, 0);
  const totalRecharged = users.reduce((sum, u) => sum + u.totalRecharged, 0);
  const totalUsed = users.reduce((sum, u) => sum + u.totalUsed, 0);

  return (
    <div>
      <Typography.Title className={styles.header} level={4}>
        用户管理
      </Typography.Title>

      {/* Stats */}
      <div className={styles.statsRow}>
        <Card style={{ flex: 1 }}>
          <Statistic prefix={<Users size={16} />} title="用户总数" value={total} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Statistic
            prefix={<Coins size={16} />}
            suffix="元"
            title="余额总计"
            value={totalBalance.toFixed(2)}
          />
        </Card>
        <Card style={{ flex: 1 }}>
          <Statistic
            suffix="元"
            title="累计充值"
            value={totalRecharged.toFixed(2)}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
        <Card style={{ flex: 1 }}>
          <Statistic
            suffix="元"
            title="累计消费"
            value={totalUsed.toFixed(2)}
            valueStyle={{ color: '#1677ff' }}
          />
        </Card>
      </div>

      {/* Table */}
      <Card className={styles.tableCard}>
        <div className={styles.toolbar}>
          <Input
            allowClear
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchUsers()}
            placeholder="搜索用户名、邮箱..."
            prefix={<Search className={styles.icon} size={16} />}
            style={{ width: 300 }}
            value={search}
          />
          <Button icon={<RefreshCw size={14} />} onClick={fetchUsers}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          pagination={{
            current: page,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            pageSize,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            total,
          }}
          rowKey="id"
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* Balance Modal */}
      <Modal
        onCancel={() => {
          setBalanceModal({ action: 'recharge', open: false, user: null });
          form.resetFields();
        }}
        onOk={() => form.submit()}
        open={balanceModal.open}
        title={
          balanceModal.action === 'recharge'
            ? '充值余额'
            : balanceModal.action === 'deduct'
              ? '扣减余额'
              : '设置余额'
        }
      >
        <Form form={form} layout="vertical" onFinish={handleBalanceSubmit}>
          <Form.Item label="用户">
            <Typography.Text>
              {balanceModal.user?.username || balanceModal.user?.email || balanceModal.user?.id}
            </Typography.Text>
            <Typography.Text style={{ marginLeft: 16 }} type="secondary">
              当前余额: ¥{balanceModal.user?.balance.toFixed(2)}
            </Typography.Text>
          </Form.Item>

          <Form.Item label="操作类型">
            <Radio.Group
              onChange={(e) => setBalanceModal((prev) => ({ ...prev, action: e.target.value }))}
              value={balanceModal.action}
            >
              <Radio.Button value="recharge">充值</Radio.Button>
              <Radio.Button value="deduct">扣减</Radio.Button>
              <Radio.Button value="set">设置</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="金额" name="amount" rules={[{ message: '请输入金额', required: true }]}>
            <InputNumber addonBefore="¥" min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
