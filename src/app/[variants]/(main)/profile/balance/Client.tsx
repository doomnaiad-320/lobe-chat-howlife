'use client';

import { FormGroup } from '@lobehub/ui';
import { Empty, Spin, Table, Tag } from 'antd';
import { createStyles } from 'antd-style';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { FORM_STYLE } from '@/const/layoutTokens';
import { lambdaQuery } from '@/libs/trpc/client';
import { useUserStore } from '@/store/user';

const useStyles = createStyles(({ css, token }) => ({
  balanceCard: css`
    margin-block-end: 24px;
    padding: 24px;
    border: 1px solid ${token.colorPrimaryBorder};
    border-radius: ${token.borderRadiusLG}px;

    background: linear-gradient(
      135deg,
      ${token.colorPrimaryBg} 0%,
      ${token.colorPrimaryBgHover} 100%
    );
  `,
  balanceLabel: css`
    margin-block-end: 8px;
    font-size: 14px;
    color: ${token.colorTextSecondary};
  `,
  balanceValue: css`
    font-size: 32px;
    font-weight: 600;
    color: ${token.colorPrimary};
  `,
}));

interface BalanceLogItem {
  amount: number;
  balanceAfter: number;
  balanceBefore: number;
  createdAt: Date | null;
  description: string | null;
  id: number;
  type: string;
}

const typeLabels: Record<string, { color: string; label: string }> = {
  adjust: { color: 'purple', label: '调整' },
  consume: { color: 'orange', label: '消费' },
  deduct: { color: 'red', label: '扣减' },
  recharge: { color: 'green', label: '充值' },
  refund: { color: 'blue', label: '退款' },
};

const Client = memo<{ mobile?: boolean }>(({ mobile }) => {
  const { t } = useTranslation('auth');
  const { styles } = useStyles();
  const balance = useUserStore((s) => s.balance);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = lambdaQuery.user.getBalanceLogs.useQuery({
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const columns: ColumnsType<BalanceLogItem> = [
    {
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const info = typeLabels[type] || { color: 'default', label: type };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
      title: '类型',
      width: 80,
    },
    {
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <span style={{ color: amount >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
          {amount >= 0 ? '+' : ''}
          {amount.toFixed(4)}
        </span>
      ),
      title: '变动金额',
      width: 100,
    },
    {
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      render: (val) => `¥${val.toFixed(2)}`,
      title: '变动后余额',
      width: 100,
    },
    {
      dataIndex: 'description',
      ellipsis: true,
      key: 'description',
      title: '描述',
    },
    {
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
      title: '时间',
      width: 150,
    },
  ];

  return (
    <Flexbox gap={mobile ? 0 : 24}>
      {/* 余额卡片 */}
      <div className={styles.balanceCard}>
        <div className={styles.balanceLabel}>{t('balance.current', '当前余额')}</div>
        <div className={styles.balanceValue}>¥{balance.toFixed(2)}</div>
      </div>

      {/* 变动记录 */}
      <FormGroup
        style={FORM_STYLE.style}
        title={t('balance.logs', '余额变动记录')}
        variant={'borderless'}
      >
        <Spin spinning={isLoading}>
          {data?.items && data.items.length > 0 ? (
            <Table
              columns={columns}
              dataSource={data.items}
              pagination={{
                current: page,
                onChange: setPage,
                pageSize,
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 条`,
                size: 'small',
                total: data.total,
              }}
              rowKey="id"
              scroll={{ x: mobile ? 500 : undefined }}
              size="small"
            />
          ) : (
            !isLoading && <Empty description={t('balance.noLogs', '暂无余额变动记录')} />
          )}
        </Spin>
      </FormGroup>
    </Flexbox>
  );
});

export default Client;
