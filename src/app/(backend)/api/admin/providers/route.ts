import { adminProviderConfig, serverDB } from '@lobechat/database';
import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/libs/admin-auth';
import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';

// GET - 获取所有服务商配置
export async function GET() {
  try {
    await requireAdmin();

    const providers = await serverDB
      .select({
        apiKeyEncrypted: adminProviderConfig.apiKeyEncrypted,
        baseUrl: adminProviderConfig.baseUrl,
        createdAt: adminProviderConfig.createdAt,
        displayName: adminProviderConfig.displayName,
        enabled: adminProviderConfig.enabled,
        id: adminProviderConfig.id,
        provider: adminProviderConfig.provider,
        sdkType: adminProviderConfig.sdkType,
        sort: adminProviderConfig.sort,
        updatedAt: adminProviderConfig.updatedAt,
      })
      .from(adminProviderConfig)
      .orderBy(desc(adminProviderConfig.sort), adminProviderConfig.provider);

    // 返回时隐藏完整的 API Key，只显示前缀
    const data = providers.map((p) => ({
      ...p,
      apiKeyMasked: p.apiKeyEncrypted ? 'sk-***' : null,
      apiKeyEncrypted: undefined, // 不返回加密的 key
    }));

    return NextResponse.json({
      data,
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Get providers error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}

// POST - 添加服务商配置
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const {
      provider,
      displayName,
      baseUrl,
      apiKey,
      sdkType = 'openai',
      enabled = true,
      sort = 0,
    } = body;

    if (!provider || !baseUrl || !apiKey) {
      return NextResponse.json(
        { error: '服务商ID、Base URL 和 API Key 不能为空', success: false },
        { status: 400 },
      );
    }

    // 检查是否已存在
    const existing = await serverDB
      .select()
      .from(adminProviderConfig)
      .where(eq(adminProviderConfig.provider, provider))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: '该服务商已存在', success: false }, { status: 400 });
    }

    // 加密 API Key
    const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();
    const apiKeyEncrypted = await gateKeeper.encrypt(apiKey);

    // 插入数据
    const [newProvider] = await serverDB
      .insert(adminProviderConfig)
      .values({
        apiKeyEncrypted,
        baseUrl,
        displayName,
        enabled,
        provider,
        sdkType,
        sort,
      })
      .returning();

    return NextResponse.json({
      data: {
        ...newProvider,
        apiKeyEncrypted: undefined,
        apiKeyMasked: 'sk-***',
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Create provider error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
