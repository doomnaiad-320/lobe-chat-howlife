'use client';

import {
  App,
  Button,
  Card,
  Divider,
  Form,
  InputNumber,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import { createStyles } from 'antd-style';
import { Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    max-width: 600px;
    margin-block-end: 24px;
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-block-end: 24px;
  `,
}));

interface SettingsData {
  currency: { code: string; symbol: string };
  global_price_multiplier: { value: number };
  min_balance_threshold: { value: number };
  usd_to_cny_rate: { value: number };
}

export default function AdminSettingsPage() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();

      if (data.success) {
        const settings = data.data as SettingsData;
        form.setFieldsValue({
          currency: settings.currency?.code || 'CNY',
          globalPriceMultiplier: settings.global_price_multiplier?.value || 1.0,
          minBalanceThreshold: settings.min_balance_threshold?.value || 0.01,
          usdToCnyRate: settings.usd_to_cny_rate?.value || 7.3,
        });
      } else {
        message.error(data.error || '获取设置失败');
      }
    } catch {
      message.error('获取设置失败');
    } finally {
      setLoading(false);
    }
  }, [form, message]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (values: {
    currency: string;
    globalPriceMultiplier: number;
    minBalanceThreshold: number;
    usdToCnyRate: number;
  }) => {
    setSaving(true);
    try {
      const currencyMap: Record<string, string> = {
        CNY: '¥',
        USD: '$',
      };

      const settings = {
        currency: { code: values.currency, symbol: currencyMap[values.currency] || '¥' },
        global_price_multiplier: { value: values.globalPriceMultiplier },
        min_balance_threshold: { value: values.minBalanceThreshold },
        usd_to_cny_rate: { value: values.usdToCnyRate },
      };

      const res = await fetch('/api/admin/settings', {
        body: JSON.stringify({ settings }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      });

      const data = await res.json();

      if (data.success) {
        message.success('设置已保存');
      } else {
        message.error(data.error || '保存失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          系统设置
        </Typography.Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Card className={styles.card} title="价格设置">
          <Form.Item
            label="全局价格倍率"
            name="globalPriceMultiplier"
            rules={[{ message: '请输入价格倍率', required: true }]}
            tooltip="所有模型的默认价格都会乘以此倍率"
          >
            <InputNumber
              addonAfter="倍"
              min={0.1}
              placeholder="1.5"
              precision={2}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="最低余额阈值"
            name="minBalanceThreshold"
            rules={[{ message: '请输入最低余额', required: true }]}
            tooltip="用户余额低于此值时无法发送消息"
          >
            <InputNumber
              addonAfter="元"
              min={0}
              placeholder="0.01"
              precision={2}
              step={0.01}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Card>

        <Card className={styles.card} title="货币设置">
          <Form.Item
            label="显示货币"
            name="currency"
            rules={[{ message: '请选择货币', required: true }]}
          >
            <Select
              options={[
                { label: 'CNY (¥)', value: 'CNY' },
                { label: 'USD ($)', value: 'USD' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="USD 兑 CNY 汇率"
            name="usdToCnyRate"
            rules={[{ message: '请输入汇率', required: true }]}
            tooltip="用于将模型默认价格（USD）转换为人民币"
          >
            <InputNumber
              addonBefore="1 USD ="
              addonAfter="CNY"
              min={0.01}
              placeholder="7.3"
              precision={2}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Card>

        <Divider />

        <Space>
          <Button htmlType="submit" icon={<Save size={14} />} loading={saving} type="primary">
            保存设置
          </Button>
        </Space>
      </Form>
    </div>
  );
}
