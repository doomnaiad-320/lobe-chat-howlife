import { serverDB } from '@lobechat/database';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { userBalances, users } from '@/database/schemas';
import { requireAdmin } from '@/libs/admin-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取单个用户详情
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    const [user] = await serverDB
      .select({
        avatar: users.avatar,
        balance: userBalances.balance,
        banExpires: users.banExpires,
        banReason: users.banReason,
        banned: users.banned,
        createdAt: users.createdAt,
        email: users.email,
        fullName: users.fullName,
        id: users.id,
        lastActiveAt: users.lastActiveAt,
        phone: users.phone,
        role: users.role,
        totalRecharged: userBalances.totalRecharged,
        totalUsed: userBalances.totalUsed,
        username: users.username,
      })
      .from(users)
      .leftJoin(userBalances, eq(users.id, userBalances.userId))
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found', success: false }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...user,
        balance: user.balance ? Number(user.balance) : 0,
        totalRecharged: user.totalRecharged ? Number(user.totalRecharged) : 0,
        totalUsed: user.totalUsed ? Number(user.totalUsed) : 0,
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}

// 更新用户（封禁、角色等）
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const { banned, banReason, banExpires, role } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof banned === 'boolean') {
      updateData.banned = banned;
      if (!banned) {
        updateData.banReason = null;
        updateData.banExpires = null;
      }
    }
    if (banReason !== undefined) updateData.banReason = banReason;
    if (banExpires !== undefined) updateData.banExpires = banExpires ? new Date(banExpires) : null;
    if (role !== undefined) updateData.role = role;

    await serverDB.update(users).set(updateData).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
