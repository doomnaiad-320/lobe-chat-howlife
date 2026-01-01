'use client';

import { App, ConfigProvider, Layout, Menu, Typography, theme } from 'antd';
import type { MenuProps } from 'antd';
import { createStyles } from 'antd-style';
import {
  Bot,
  Coins,
  FileText,
  LayoutDashboard,
  LogOut,
  Server,
  Settings,
  Users,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

const { Sider, Content } = Layout;

const useStyles = createStyles(({ css, token }) => ({
  content: css`
    overflow: auto;
    min-height: 100vh;
    padding: 24px;
    background: ${token.colorBgLayout};
  `,
  layout: css`
    min-height: 100vh;
  `,
  logo: css`
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;

    height: 64px;
    padding: 16px;
    border-block-end: 1px solid ${token.colorBorderSecondary};
  `,
  sider: css`
    border-inline-end: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer} !important;

    .ant-layout-sider-children {
      display: flex;
      flex-direction: column;
    }
  `,
  menu: css`
    flex: 1;
    border-inline-end: none !important;
  `,
  footer: css`
    padding: 16px;
    border-block-start: 1px solid ${token.colorBorderSecondary};
  `,
}));

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  {
    key: '/admin',
    icon: <LayoutDashboard size={16} />,
    label: '仪表盘',
  },
  {
    key: '/admin/users',
    icon: <Users size={16} />,
    label: '用户管理',
  },
  {
    key: '/admin/logs',
    icon: <FileText size={16} />,
    label: '余额日志',
  },
  {
    type: 'divider',
  },
  {
    key: '/admin/providers',
    icon: <Server size={16} />,
    label: '服务商管理',
  },
  {
    key: '/admin/models',
    icon: <Bot size={16} />,
    label: '模型管理',
  },
  {
    type: 'divider',
  },
  {
    key: '/admin/settings',
    icon: <Settings size={16} />,
    label: '系统设置',
  },
];

interface AdminLayoutProps {
  children: ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const { styles } = useStyles();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      if (!data.authenticated) {
        router.push('/admin/login');
      }
    } catch {
      router.push('/admin/login');
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    router.push(e.key);
  };

  // Determine selected key based on pathname
  const selectedKey =
    pathname === '/admin'
      ? '/admin'
      : (menuItems.find(
          (item) =>
            item &&
            'key' in item &&
            pathname.startsWith(item.key as string) &&
            item.key !== '/admin',
        )?.key as string) || '/admin';

  return (
    <Layout className={styles.layout}>
      <Sider
        className={styles.sider}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={220}
      >
        <div className={styles.logo}>
          <Coins size={24} />
          {!collapsed && (
            <Typography.Title level={5} style={{ margin: 0 }}>
              HowLife Admin
            </Typography.Title>
          )}
        </div>
        <Menu
          className={styles.menu}
          items={menuItems}
          mode="inline"
          onClick={handleMenuClick}
          selectedKeys={[selectedKey]}
        />
        <div className={styles.footer}>
          <Menu
            items={[
              {
                key: 'logout',
                icon: <LogOut size={16} />,
                label: collapsed ? '' : '退出登录',
                onClick: handleLogout,
              },
            ]}
            mode="inline"
            selectable={false}
            style={{ borderInlineEnd: 'none' }}
          />
        </div>
      </Sider>
      <Content className={styles.content}>{children}</Content>
    </Layout>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
      }}
    >
      <App>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </App>
    </ConfigProvider>
  );
}
