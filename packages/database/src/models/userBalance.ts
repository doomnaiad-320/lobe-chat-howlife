import { eq, sql } from 'drizzle-orm';

import { NewUserBalance, UserBalanceItem, userBalances } from '../schemas';
import { LobeChatDatabase } from '../type';

export class UserBalanceModel {
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase) {
    this.db = db;
  }

  /**
   * 获取用户余额，如果不存在则创建
   */
  getOrCreate = async (userId: string): Promise<UserBalanceItem> => {
    const existing = await this.db.query.userBalances.findFirst({
      where: eq(userBalances.userId, userId),
    });

    if (existing) {
      return existing;
    }

    // 创建新的余额记录
    const [newBalance] = await this.db.insert(userBalances).values({ userId }).returning();

    return newBalance;
  };

  /**
   * 获取用户余额
   */
  get = async (userId: string): Promise<UserBalanceItem | undefined> => {
    return this.db.query.userBalances.findFirst({
      where: eq(userBalances.userId, userId),
    });
  };

  /**
   * 充值（增加余额）
   */
  recharge = async (userId: string, amount: number): Promise<UserBalanceItem> => {
    // 确保用户余额记录存在
    await this.getOrCreate(userId);

    const [updated] = await this.db
      .update(userBalances)
      .set({
        balance: sql`${userBalances.balance} + ${amount}`,
        totalRecharged: sql`${userBalances.totalRecharged} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(userBalances.userId, userId))
      .returning();

    return updated;
  };

  /**
   * 扣减余额
   */
  deduct = async (userId: string, amount: number): Promise<UserBalanceItem> => {
    // 确保用户余额记录存在
    await this.getOrCreate(userId);

    const [updated] = await this.db
      .update(userBalances)
      .set({
        balance: sql`${userBalances.balance} - ${amount}`,
        totalUsed: sql`${userBalances.totalUsed} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(userBalances.userId, userId))
      .returning();

    return updated;
  };

  /**
   * 设置余额（管理员直接设置）
   */
  setBalance = async (userId: string, balance: number): Promise<UserBalanceItem> => {
    // 确保用户余额记录存在
    await this.getOrCreate(userId);

    const [updated] = await this.db
      .update(userBalances)
      .set({
        balance: String(balance),
        updatedAt: new Date(),
      })
      .where(eq(userBalances.userId, userId))
      .returning();

    return updated;
  };

  // Static methods
  static create = async (db: LobeChatDatabase, params: NewUserBalance) => {
    const [balance] = await db.insert(userBalances).values(params).returning();
    return balance;
  };

  static findByUserId = async (db: LobeChatDatabase, userId: string) => {
    return db.query.userBalances.findFirst({
      where: eq(userBalances.userId, userId),
    });
  };
}
