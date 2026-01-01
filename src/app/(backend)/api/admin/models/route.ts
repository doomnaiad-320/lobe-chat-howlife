import { adminModelConfig, adminProviderConfig, serverDB } from '@lobechat/database';
import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/libs/admin-auth';

// GET - 获取所有模型配置
export async function GET() {
  try {
    await requireAdmin();

    const models = await serverDB
      .select()
      .from(adminModelConfig)
      .orderBy(desc(adminModelConfig.sort), adminModelConfig.provider, adminModelConfig.modelId);

    // 获取所有服务商用于关联显示
    const providers = await serverDB.select().from(adminProviderConfig);
    const providerMap = new Map(providers.map((p) => [p.provider, p]));

    const data = models.map((m) => ({
      ...m,
      inputPrice: m.inputPrice ? Number(m.inputPrice) : null,
      multiplier: m.multiplier ? Number(m.multiplier) : 1,
      outputPrice: m.outputPrice ? Number(m.outputPrice) : null,
      providerDisplayName: providerMap.get(m.provider)?.displayName || m.provider,
    }));

    return NextResponse.json({
      data,
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Get models error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}

// POST - 添加模型配置
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const {
      provider,
      modelId,
      displayName,
      description,
      type = 'chat',
      abilityFunctionCall = false,
      abilityVision = false,
      abilityReasoning = false,
      abilitySearch = false,
      abilityImageOutput = false,
      abilityVideo = false,
      contextWindowTokens,
      maxOutputTokens,
      inputPrice,
      outputPrice,
      multiplier = 1,
      isCustom = false,
      enabled = true,
      sort = 0,
    } = body;

    if (!provider || !modelId) {
      return NextResponse.json(
        { error: '服务商和模型 ID 不能为空', success: false },
        { status: 400 },
      );
    }

    // 检查服务商是否存在
    const providerExists = await serverDB
      .select()
      .from(adminProviderConfig)
      .where(eq(adminProviderConfig.provider, provider))
      .limit(1);

    if (providerExists.length === 0) {
      return NextResponse.json(
        { error: '服务商不存在，请先添加服务商', success: false },
        { status: 400 },
      );
    }

    // 检查模型是否已存在
    const existing = await serverDB
      .select()
      .from(adminModelConfig)
      .where(eq(adminModelConfig.provider, provider))
      .limit(100);

    if (existing.some((m) => m.modelId === modelId)) {
      return NextResponse.json({ error: '该模型已存在', success: false }, { status: 400 });
    }

    // 插入数据
    const [newModel] = await serverDB
      .insert(adminModelConfig)
      .values({
        abilityFunctionCall,
        abilityImageOutput,
        abilityReasoning,
        abilitySearch,
        abilityVideo,
        abilityVision,
        contextWindowTokens,
        description,
        displayName,
        enabled,
        inputPrice: inputPrice?.toString(),
        isCustom,
        maxOutputTokens,
        modelId,
        multiplier: multiplier?.toString(),
        outputPrice: outputPrice?.toString(),
        provider,
        sort,
        type,
      })
      .returning();

    return NextResponse.json({
      data: newModel,
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Create model error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
