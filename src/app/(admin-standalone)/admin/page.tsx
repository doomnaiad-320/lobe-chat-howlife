'use client';

import { Card, Col, Row, Statistic, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { Bot, Coins, Server, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

const useStyles = createStyles(({ css, token }) => ({
  header: css`
    margin-block-end: 24px;
  `,
  statsCard: css`
    border-radius: ${token.borderRadiusLG}px;
  `,
  welcome: css`
    margin-block-end: 24px;
    padding: 24px;
    border-radius: ${token.borderRadiusLG}px;
    background: linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%);
  `,
}));

interface DashboardStats {
  totalUsers: number;
  totalBalance: number;
  totalProviders: number;
  totalModels: number;
}

export default function AdminDashboardPage() {
  const { styles } = useStyles();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalBalance: 0,
    totalProviders: 0,
    totalModels: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch user stats
        const usersRes = await fetch('/api/admin/users?page=1&pageSize=1');
        const usersData = await usersRes.json();

        if (usersData.success) {
          setStats((prev) => ({
            ...prev,
            totalUsers: usersData.total || 0,
          }));
        }

        // TODO: Fetch provider and model stats when APIs are ready
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div className={styles.welcome}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          欢迎回来，管理员
        </Typography.Title>
        <Typography.Text type="secondary">
          在这里管理您的 AI 服务商、模型配置和用户余额
        </Typography.Text>
      </div>

      <Typography.Title className={styles.header} level={4}>
        系统概览
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card className={styles.statsCard} loading={loading}>
            <Statistic
              prefix={<Users size={20} style={{ marginRight: 8 }} />}
              title="用户总数"
              value={stats.totalUsers}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className={styles.statsCard} loading={loading}>
            <Statistic
              prefix={<Coins size={20} style={{ marginRight: 8 }} />}
              suffix="元"
              title="余额总计"
              value={stats.totalBalance}
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className={styles.statsCard} loading={loading}>
            <Statistic
              prefix={<Server size={20} style={{ marginRight: 8 }} />}
              title="服务商数量"
              value={stats.totalProviders}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className={styles.statsCard} loading={loading}>
            <Statistic
              prefix={<Bot size={20} style={{ marginRight: 8 }} />}
              title="模型数量"
              value={stats.totalModels}
            />
          </Card>
        </Col>
      </Row>

      <Typography.Title level={4} style={{ marginTop: 32 }}>
        快速开始
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card hoverable onClick={() => (window.location.href = '/admin/providers')}>
            <Card.Meta
              avatar={<Server size={24} />}
              title="配置服务商"
              description="添加 OpenAI、Anthropic 等 AI 服务商的 API Key"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => (window.location.href = '/admin/models')}>
            <Card.Meta
              avatar={<Bot size={24} />}
              title="管理模型"
              description="配置可用模型列表和价格倍率"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => (window.location.href = '/admin/users')}>
            <Card.Meta
              avatar={<Users size={24} />}
              title="用户管理"
              description="管理用户余额和账户状态"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
