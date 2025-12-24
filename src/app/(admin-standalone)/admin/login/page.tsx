'use client';

import { App, Button, ConfigProvider, Form, Input, theme } from 'antd';
import { createStyles } from 'antd-style';
import { Lock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    padding-block: 2.5rem;
padding-inline: 2rem;
  `,
  container: css`
    width: 360px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
  icon: css`
    color: ${token.colorTextSecondary};
  `,
  page: css`
    display: flex;
    align-items: center;
    justify-content: center;

    min-height: 100vh;

    background: ${token.colorBgLayout};
  `,
  subtitle: css`
    margin-block-start: 0.5rem;
    font-size: 14px;
    color: ${token.colorTextSecondary};
    text-align: center;
  `,
  title: css`
    margin-block: 0 0.5rem;
    margin-inline: 0;

    font-size: 24px;
    font-weight: 600;
    color: ${token.colorTextHeading};
    text-align: center;
  `,
}));

interface LoginFormValues {
  password: string;
  username: string;
}

function AdminLoginContent() {
  const { styles } = useStyles();
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        body: JSON.stringify(values),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        message.success('登录成功');
        router.push('/admin/users');
      } else {
        message.error(data.error || '登录失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>管理后台</h1>
          <p className={styles.subtitle}>请输入管理员账号密码</p>

          <Form form={form} layout="vertical" onFinish={handleLogin} style={{ marginTop: '2rem' }}>
            <Form.Item name="username" rules={[{ message: '请输入用户名', required: true }]}>
              <Input
                placeholder="用户名"
                prefix={<User className={styles.icon} size={16} />}
                size="large"
              />
            </Form.Item>

            <Form.Item name="password" rules={[{ message: '请输入密码', required: true }]}>
              <Input.Password
                placeholder="密码"
                prefix={<Lock className={styles.icon} size={16} />}
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button block htmlType="submit" loading={loading} size="large" type="primary">
                登录
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
      }}
    >
      <App>
        <AdminLoginContent />
      </App>
    </ConfigProvider>
  );
}
