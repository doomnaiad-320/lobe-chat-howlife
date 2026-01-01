import { adminProviderConfig, serverDB } from '@lobechat/database';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/libs/admin-auth';
import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - 更新服务商配置
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const providerId = Number.parseInt(id, 10);

    if (Number.isNaN(providerId)) {
      return NextResponse.json({ error: '无效的 ID', success: false }, { status: 400 });
    }

    const body = await req.json();
    const { displayName, baseUrl, apiKey, sdkType, enabled, sort } = body;

    // 检查是否存在
    const existing = await serverDB
      .select()
      .from(adminProviderConfig)
      .where(eq(adminProviderConfig.id, providerId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: '服务商不存在', success: false }, { status: 404 });
    }

    // 构建更新数据
    const updateData: Partial<typeof adminProviderConfig.$inferInsert> = {};

    if (displayName !== undefined) updateData.displayName = displayName;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (sdkType !== undefined) updateData.sdkType = sdkType;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (sort !== undefined) updateData.sort = sort;

    // 如果提供了新的 API Key，则加密并更新
    if (apiKey) {
      const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();
      updateData.apiKeyEncrypted = await gateKeeper.encrypt(apiKey);
    }

    // 更新数据
    const [updated] = await serverDB
      .update(adminProviderConfig)
      .set(updateData)
      .where(eq(adminProviderConfig.id, providerId))
      .returning();

    return NextResponse.json({
      data: {
        ...updated,
        apiKeyEncrypted: undefined,
        apiKeyMasked: 'sk-***',
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Update provider error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}

// DELETE - 删除服务商配置
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const providerId = Number.parseInt(id, 10);

    if (Number.isNaN(providerId)) {
      return NextResponse.json({ error: '无效的 ID', success: false }, { status: 400 });
    }

    // 检查是否存在
    const existing = await serverDB
      .select()
      .from(adminProviderConfig)
      .where(eq(adminProviderConfig.id, providerId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: '服务商不存在', success: false }, { status: 404 });
    }

    // 删除
    await serverDB.delete(adminProviderConfig).where(eq(adminProviderConfig.id, providerId));

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Delete provider error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
