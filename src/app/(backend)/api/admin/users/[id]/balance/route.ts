import { serverDB } from '@lobechat/database';
import { eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { balanceLogs, userBalances } from '@/database/schemas';
import { requireAdmin } from '@/libs/admin-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 余额操作：充值或扣减
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin();
    const { id: userId } = await params;

    // 安全解析 JSON body
    let body;
    try {
      const text = await req.text();
      console.log('[Balance API] Received body text:', text);
      if (!text) {
        return NextResponse.json(
          { error: 'Request body is empty', success: false },
          { status: 400 },
        );
      }
      body = JSON.parse(text);
      console.log('[Balance API] Parsed body:', body);
    } catch (parseError) {
      console.error('[Balance API] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', success: false },
        { status: 400 },
      );
    }

    const { action, amount, reason } = body as {
      action: 'recharge' | 'deduct' | 'set';
      amount: number;
      reason?: string;
    };

    if (!action || typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        { error: 'Invalid parameters: action and amount are required', success: false },
        { status: 400 },
      );
    }

    // 确保用户余额记录存在
    let existing = await serverDB.query.userBalances.findFirst({
      where: eq(userBalances.userId, userId),
    });

    if (!existing) {
      // 创建新的余额记录
      [existing] = await serverDB.insert(userBalances).values({ userId }).returning();
    }

    const balanceBefore = Number(existing.balance);
    let updated;
    let balanceAfter: number;
    let logType: string;
    let logAmount: number;

    switch (action) {
      case 'recharge': {
        // 充值：增加余额和累计充值
        [updated] = await serverDB
          .update(userBalances)
          .set({
            balance: sql`${userBalances.balance} + ${amount}`,
            totalRecharged: sql`${userBalances.totalRecharged} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(userBalances.userId, userId))
          .returning();
        balanceAfter = Number(updated.balance);
        logType = 'recharge';
        logAmount = amount;
        break;
      }

      case 'deduct': {
        // 扣减：减少余额，增加累计消费
        [updated] = await serverDB
          .update(userBalances)
          .set({
            balance: sql`${userBalances.balance} - ${amount}`,
            totalUsed: sql`${userBalances.totalUsed} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(userBalances.userId, userId))
          .returning();
        balanceAfter = Number(updated.balance);
        logType = 'deduct';
        logAmount = -amount;
        break;
      }

      case 'set': {
        // 直接设置余额
        [updated] = await serverDB
          .update(userBalances)
          .set({
            balance: String(amount),
            updatedAt: new Date(),
          })
          .where(eq(userBalances.userId, userId))
          .returning();
        balanceAfter = Number(updated.balance);
        logType = 'adjust';
        logAmount = balanceAfter - balanceBefore;
        break;
      }

      default: {
        return NextResponse.json(
          { error: 'Invalid action: must be recharge, deduct, or set', success: false },
          { status: 400 },
        );
      }
    }

    // 记录余额变动日志
    await serverDB.insert(balanceLogs).values({
      amount: String(logAmount),
      balanceAfter: String(balanceAfter),
      balanceBefore: String(balanceBefore),
      description: reason || `Admin ${action}: ${amount}`,
      operatorId: admin.username,
      type: logType,
      userId,
    });

    return NextResponse.json({
      data: {
        balance: Number(updated.balance),
        totalRecharged: Number(updated.totalRecharged),
        totalUsed: Number(updated.totalUsed),
        userId: updated.userId,
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Balance operation error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
