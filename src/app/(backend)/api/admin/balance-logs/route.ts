import { serverDB } from '@lobechat/database';
import { SQL, and, count, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { balanceLogs, users } from '@/database/schemas';
import { requireAdmin } from '@/libs/admin-auth';

// 获取所有用户的余额变动日志
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;
    const userId = searchParams.get('userId') || '';
    const type = searchParams.get('type') || '';

    const offset = (page - 1) * pageSize;

    // 构建查询条件
    const conditions: SQL[] = [];
    if (userId) {
      conditions.push(eq(balanceLogs.userId, userId));
    }
    if (type) {
      conditions.push(eq(balanceLogs.type, type));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // 查询日志列表（左连接用户表获取用户信息）
    const logList = await serverDB
      .select({
        amount: balanceLogs.amount,
        balanceAfter: balanceLogs.balanceAfter,
        balanceBefore: balanceLogs.balanceBefore,
        createdAt: balanceLogs.createdAt,
        description: balanceLogs.description,
        id: balanceLogs.id,
        operatorId: balanceLogs.operatorId,
        type: balanceLogs.type,
        userEmail: users.email,
        userId: balanceLogs.userId,
        username: users.username,
      })
      .from(balanceLogs)
      .leftJoin(users, eq(balanceLogs.userId, users.id))
      .where(whereCondition)
      .orderBy(desc(balanceLogs.createdAt))
      .limit(pageSize)
      .offset(offset);

    // 查询总数
    const [{ total }] = await serverDB
      .select({ total: count() })
      .from(balanceLogs)
      .where(whereCondition);

    return NextResponse.json({
      data: logList.map((log) => ({
        ...log,
        amount: Number(log.amount),
        balanceAfter: Number(log.balanceAfter),
        balanceBefore: Number(log.balanceBefore),
      })),
      page,
      pageSize,
      success: true,
      total,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('Get balance logs error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
