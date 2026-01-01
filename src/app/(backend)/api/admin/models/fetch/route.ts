import { adminProviderConfig, serverDB } from '@lobechat/database';
import { ModelRuntime } from '@lobechat/model-runtime';
import { ChatModelCard } from '@lobechat/types';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/libs/admin-auth';
import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';

/**
 * POST - 从远程服务商获取模型列表
 * 使用 admin 配置的凭证调用服务商的 /v1/models 接口
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { provider } = body;

    if (!provider) {
      return NextResponse.json({ error: '请指定服务商', success: false }, { status: 400 });
    }

    // 获取服务商配置
    const [providerConfig] = await serverDB
      .select()
      .from(adminProviderConfig)
      .where(eq(adminProviderConfig.provider, provider))
      .limit(1);

    if (!providerConfig) {
      return NextResponse.json({ error: '服务商不存在', success: false }, { status: 404 });
    }

    if (!providerConfig.enabled) {
      return NextResponse.json({ error: '服务商未启用', success: false }, { status: 400 });
    }

    // 解密 API Key
    const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();
    const { plaintext: apiKey, wasAuthentic } = await gateKeeper.decrypt(
      providerConfig.apiKeyEncrypted,
    );

    if (!wasAuthentic) {
      return NextResponse.json({ error: 'API Key 解密失败', success: false }, { status: 500 });
    }

    // 使用 sdkType 或 provider 作为 runtime provider
    const runtimeProvider = providerConfig.sdkType || provider;

    // 初始化 ModelRuntime
    const runtime = ModelRuntime.initializeWithProvider(runtimeProvider, {
      apiKey,
      baseURL: providerConfig.baseUrl,
    });

    // 获取模型列表
    const models = await runtime.models();

    // 转换为统一格式
    const data = models.map((model: ChatModelCard) => ({
      abilities: {
        functionCall: model.functionCall || false,
        imageOutput: model.imageOutput || false,
        reasoning: model.reasoning || false,
        search: model.search || false,
        video: model.video || false,
        vision: model.vision || false,
      },
      contextWindowTokens: model.contextWindowTokens,
      description: model.description,
      displayName: model.displayName || model.id,
      id: model.id,
      maxOutput: model.maxOutput,
      pricing: model.pricing,
      releasedAt: model.releasedAt,
      type: model.type || 'chat',
    }));

    return NextResponse.json({
      data,
      message: `成功获取 ${data.length} 个模型`,
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    console.error('Fetch models error:', error);

    // 提供更详细的错误信息
    const errorMessage =
      error instanceof Error ? error.message : '获取模型列表失败，请检查服务商配置';

    return NextResponse.json({ error: errorMessage, success: false }, { status: 500 });
  }
}
