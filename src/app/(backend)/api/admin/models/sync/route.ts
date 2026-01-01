import { adminModelConfig, adminProviderConfig, serverDB } from '@lobechat/database';
import { and, eq } from 'drizzle-orm';
import { LOBE_DEFAULT_MODEL_LIST, LobeDefaultAiModelListItem } from 'model-bank';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/libs/admin-auth';

// POST - 从 model-bank 同步模型到数据库
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { provider, overwrite = false } = body;

    if (!provider) {
      return NextResponse.json({ error: '请指定服务商', success: false }, { status: 400 });
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

    // 从 model-bank 获取该服务商的模型
    const providerModels = LOBE_DEFAULT_MODEL_LIST.filter(
      (m: LobeDefaultAiModelListItem) => m.providerId === provider,
    );

    if (providerModels.length === 0) {
      return NextResponse.json({
        data: { added: 0, skipped: 0, updated: 0 },
        message: '该服务商没有内置模型',
        success: true,
      });
    }

    // 获取已存在的模型
    const existingModels = await serverDB
      .select()
      .from(adminModelConfig)
      .where(eq(adminModelConfig.provider, provider));

    const existingModelIds = new Set(existingModels.map((m) => m.modelId));

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const model of providerModels) {
      const modelData = {
        abilityFunctionCall: model.abilities?.functionCall || false,
        abilityImageOutput: model.abilities?.imageOutput || false,
        abilityReasoning: model.abilities?.reasoning || false,
        abilitySearch: model.abilities?.search || false,
        abilityVideo: model.abilities?.video || false,
        abilityVision: model.abilities?.vision || false,
        contextWindowTokens: model.contextWindowTokens,
        description: model.description,
        displayName: model.displayName,
        enabled: model.enabled || false,
        inputPrice: getInputPrice(model.pricing),
        isCustom: false,
        maxOutputTokens: model.maxOutput,
        modelId: model.id,
        outputPrice: getOutputPrice(model.pricing),
        provider,
        type: model.type || 'chat',
      };

      if (existingModelIds.has(model.id)) {
        if (overwrite) {
          // 更新现有模型
          await serverDB
            .update(adminModelConfig)
            .set(modelData)
            .where(
              and(eq(adminModelConfig.provider, provider), eq(adminModelConfig.modelId, model.id)),
            );
          updated++;
        } else {
          skipped++;
        }
      } else {
        // 插入新模型
        await serverDB.insert(adminModelConfig).values(modelData);
        added++;
      }
    }

    return NextResponse.json({
      data: { added, skipped, updated },
      message: `同步完成: 新增 ${added}, 更新 ${updated}, 跳过 ${skipped}`,
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Sync models error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}

// GET - 获取可同步的服务商列表及其模型数量
export async function GET() {
  try {
    await requireAdmin();

    // 统计每个服务商的模型数量
    const providerStats = new Map<string, number>();

    for (const model of LOBE_DEFAULT_MODEL_LIST) {
      const count = providerStats.get(model.providerId) || 0;
      providerStats.set(model.providerId, count + 1);
    }

    const data = Array.from(providerStats.entries())
      .map(([providerId, count]) => ({ count, providerId }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      data,
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Get sync info error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}

// 辅助函数：从 Pricing 获取输入价格
function getInputPrice(pricing?: {
  units?: Array<{ name: string; rate?: number }>;
}): string | null {
  if (!pricing?.units) return null;
  const textInput = pricing.units.find((u) => u.name === 'textInput');
  if (textInput && 'rate' in textInput) {
    return textInput.rate?.toString() || null;
  }
  return null;
}

// 辅助函数：从 Pricing 获取输出价格
function getOutputPrice(pricing?: {
  units?: Array<{ name: string; rate?: number }>;
}): string | null {
  if (!pricing?.units) return null;
  const textOutput = pricing.units.find((u) => u.name === 'textOutput');
  if (textOutput && 'rate' in textOutput) {
    return textOutput.rate?.toString() || null;
  }
  return null;
}
