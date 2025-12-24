import { serverDB } from '@lobechat/database';
import { count, desc, eq, ilike, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { userBalances, users } from '@/database/schemas';
import { requireAdmin } from '@/libs/admin-auth';

// 获取用户列表
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * pageSize;

    // 构建查询条件
    const whereCondition = search
      ? or(
          ilike(users.username, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.fullName, `%${search}%`),
        )
      : undefined;

    // 查询用户列表（左连接余额表）
    const userList = await serverDB
      .select({
        avatar: users.avatar,
        balance: userBalances.balance,
        banned: users.banned,
        createdAt: users.createdAt,
        email: users.email,
        fullName: users.fullName,
        id: users.id,
        lastActiveAt: users.lastActiveAt,
        totalRecharged: userBalances.totalRecharged,
        totalUsed: userBalances.totalUsed,
        username: users.username,
      })
      .from(users)
      .leftJoin(userBalances, eq(users.id, userBalances.userId))
      .where(whereCondition)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset);

    // 查询总数
    const [{ total }] = await serverDB.select({ total: count() }).from(users).where(whereCondition);

    return NextResponse.json({
      data: userList.map((user) => ({
        ...user,
        balance: user.balance ? Number(user.balance) : 0,
        totalRecharged: user.totalRecharged ? Number(user.totalRecharged) : 0,
        totalUsed: user.totalUsed ? Number(user.totalUsed) : 0,
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
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
