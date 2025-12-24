'use client';

import { createStyles } from 'antd-style';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import { Link } from 'react-router-dom';

import { useUserStore } from '@/store/user';

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    cursor: pointer;

    padding-block: 8px;
    padding-inline: 12px;
    border: 1px solid ${token.colorPrimaryBorder};
    border-radius: ${token.borderRadius}px;

    background: linear-gradient(
      135deg,
      ${token.colorPrimaryBg} 0%,
      ${token.colorPrimaryBgHover} 100%
    );

    transition: all 0.2s;

    &:hover {
      transform: translateY(-1px);
      border-color: ${token.colorPrimary};
    }
  `,
  label: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  value: css`
    font-size: 18px;
    font-weight: 600;
    color: ${token.colorPrimary};
  `,
}));

const BalanceCard = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('common');
  const balance = useUserStore((s) => s.balance);

  return (
    <Link style={{ color: 'inherit', textDecoration: 'none' }} to="/profile/balance">
      <Flexbox className={styles.card} gap={4} paddingInline={8} style={{ marginBottom: 8 }}>
        <span className={styles.label}>{t('balance.current', '当前余额')}</span>
        <span className={styles.value}>
          {balance.toFixed(2)} {t('balance.unit', '元')}
        </span>
      </Flexbox>
    </Link>
  );
});

export default BalanceCard;
