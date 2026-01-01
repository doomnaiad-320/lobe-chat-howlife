import { adminSettings, serverDB } from '@lobechat/database';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/libs/admin-auth';

// GET - 获取所有设置
export async function GET() {
  try {
    await requireAdmin();

    const settings = await serverDB.select().from(adminSettings);

    // 转换为 key-value 对象
    const data: Record<string, unknown> = {};
    for (const setting of settings) {
      data[setting.key] = setting.value;
    }

    // 提供默认值
    const defaults: Record<string, unknown> = {
      currency: { code: 'CNY', symbol: '¥' },
      global_price_multiplier: { value: 1.0 },
      min_balance_threshold: { value: 0.01 },
      usd_to_cny_rate: { value: 7.3 },
    };

    return NextResponse.json({
      data: { ...defaults, ...data },
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}

// PUT - 更新设置
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { settings } = body as { settings: Record<string, unknown> };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: '无效的设置数据', success: false }, { status: 400 });
    }

    // 批量更新设置
    for (const [key, value] of Object.entries(settings)) {
      // 检查是否存在
      const [existing] = await serverDB
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.key, key))
        .limit(1);

      if (existing) {
        await serverDB
          .update(adminSettings)
          .set({ value: value as Record<string, unknown> })
          .where(eq(adminSettings.key, key));
      } else {
        await serverDB.insert(adminSettings).values({
          key,
          value: value as Record<string, unknown>,
        });
      }
    }

    return NextResponse.json({
      message: '设置已保存',
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
