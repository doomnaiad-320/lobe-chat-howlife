import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || 'admin-secret-key');
const COOKIE_NAME = 'admin_token';

export interface AdminPayload {
  role: string;
  username: string;
}

/**
 * 验证管理员身份
 * @returns AdminPayload 或 null（未认证）
 */
export async function verifyAdmin(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.role !== 'admin') {
      return null;
    }

    return {
      role: payload.role as string,
      username: payload.username as string,
    };
  } catch {
    return null;
  }
}

/**
 * 要求管理员身份，否则抛出错误
 */
export async function requireAdmin(): Promise<AdminPayload> {
  const admin = await verifyAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Admin access required');
  }
  return admin;
}
