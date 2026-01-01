import { adminModelConfig, serverDB } from '@lobechat/database';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/libs/admin-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - 更新模型配置
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const modelId = Number.parseInt(id, 10);

    if (Number.isNaN(modelId)) {
      return NextResponse.json({ error: '无效的 ID', success: false }, { status: 400 });
    }

    const body = await req.json();

    // 检查是否存在
    const existing = await serverDB
      .select()
      .from(adminModelConfig)
      .where(eq(adminModelConfig.id, modelId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: '模型不存在', success: false }, { status: 404 });
    }

    // 构建更新数据
    const updateData: Partial<typeof adminModelConfig.$inferInsert> = {};

    const fields = [
      'displayName',
      'description',
      'type',
      'abilityFunctionCall',
      'abilityVision',
      'abilityReasoning',
      'abilitySearch',
      'abilityImageOutput',
      'abilityVideo',
      'contextWindowTokens',
      'maxOutputTokens',
      'isCustom',
      'enabled',
      'sort',
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        (updateData as Record<string, unknown>)[field] = body[field];
      }
    }

    // 价格字段需要转换为字符串
    if (body.inputPrice !== undefined) {
      updateData.inputPrice = body.inputPrice?.toString() || null;
    }
    if (body.outputPrice !== undefined) {
      updateData.outputPrice = body.outputPrice?.toString() || null;
    }
    if (body.multiplier !== undefined) {
      updateData.multiplier = body.multiplier?.toString() || '1';
    }

    // 更新数据
    const [updated] = await serverDB
      .update(adminModelConfig)
      .set(updateData)
      .where(eq(adminModelConfig.id, modelId))
      .returning();

    return NextResponse.json({
      data: {
        ...updated,
        inputPrice: updated.inputPrice ? Number(updated.inputPrice) : null,
        multiplier: updated.multiplier ? Number(updated.multiplier) : 1,
        outputPrice: updated.outputPrice ? Number(updated.outputPrice) : null,
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Update model error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}

// DELETE - 删除模型配置
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const modelId = Number.parseInt(id, 10);

    if (Number.isNaN(modelId)) {
      return NextResponse.json({ error: '无效的 ID', success: false }, { status: 400 });
    }

    // 检查是否存在
    const existing = await serverDB
      .select()
      .from(adminModelConfig)
      .where(eq(adminModelConfig.id, modelId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: '模型不存在', success: false }, { status: 404 });
    }

    // 删除
    await serverDB.delete(adminModelConfig).where(eq(adminModelConfig.id, modelId));

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Delete model error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
