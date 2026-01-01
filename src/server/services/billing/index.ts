import { balanceLogs, serverDB, userBalances } from '@lobechat/database';
import { eq, sql } from 'drizzle-orm';

import { adminProviderService } from '../adminProvider';

export interface BillingCheckResult {
  balance: number;
  canProceed: boolean;
  minThreshold: number;
}

export interface DeductionResult {
  balanceAfter: number;
  balanceBefore: number;
  cost: number;
  success: boolean;
}

/**
 * Billing Service
 * Handles balance checking and deduction for AI requests
 */
export class BillingService {
  /**
   * Check if user has sufficient balance to proceed
   */
  async checkBalance(userId: string): Promise<BillingCheckResult> {
    const settings = await adminProviderService.getGlobalSettings();

    const [userBalance] = await serverDB
      .select({ balance: userBalances.balance })
      .from(userBalances)
      .where(eq(userBalances.userId, userId))
      .limit(1);

    const balance = userBalance ? Number(userBalance.balance) : 0;
    const canProceed = balance >= settings.minBalanceThreshold;

    return {
      balance,
      canProceed,
      minThreshold: settings.minBalanceThreshold,
    };
  }

  /**
   * Deduct balance after a successful AI request
   * Uses a transaction to ensure atomicity
   */
  async deductBalance(
    userId: string,
    providerId: string,
    modelId: string,
    inputTokens: number,
    outputTokens: number,
    requestId?: string,
  ): Promise<DeductionResult> {
    // Calculate cost
    const cost = await adminProviderService.calculateCost(
      providerId,
      modelId,
      inputTokens,
      outputTokens,
    );

    if (cost <= 0) {
      return {
        balanceAfter: 0,
        balanceBefore: 0,
        cost: 0,
        success: true,
      };
    }

    // Use a transaction with FOR UPDATE lock to prevent race conditions
    return await serverDB.transaction(async (tx) => {
      // Get current balance with lock
      const [currentBalance] = await tx
        .select({ balance: userBalances.balance })
        .from(userBalances)
        .where(eq(userBalances.userId, userId))
        .for('update');

      const balanceBefore = currentBalance ? Number(currentBalance.balance) : 0;
      const balanceAfter = Math.max(0, balanceBefore - cost);

      // Update balance
      if (currentBalance) {
        await tx
          .update(userBalances)
          .set({
            balance: balanceAfter.toFixed(4),
            totalUsed: sql`${userBalances.totalUsed} + ${cost.toFixed(4)}`,
          })
          .where(eq(userBalances.userId, userId));
      } else {
        // Create balance record if not exists (shouldn't happen normally)
        await tx.insert(userBalances).values({
          balance: balanceAfter.toFixed(4),
          totalUsed: cost.toFixed(4),
          userId,
        });
      }

      // Insert log
      await tx.insert(balanceLogs).values({
        amount: (-cost).toFixed(4),
        balanceAfter: balanceAfter.toFixed(4),
        balanceBefore: balanceBefore.toFixed(4),
        description: `AI请求消费: ${providerId}/${modelId} (输入${inputTokens}+输出${outputTokens} tokens)`,
        relatedRequestId: requestId,
        type: 'consume',
        userId,
      });

      return {
        balanceAfter,
        balanceBefore,
        cost,
        success: true,
      };
    });
  }

  /**
   * Get user's current balance
   */
  async getBalance(userId: string): Promise<number> {
    const [userBalance] = await serverDB
      .select({ balance: userBalances.balance })
      .from(userBalances)
      .where(eq(userBalances.userId, userId))
      .limit(1);

    return userBalance ? Number(userBalance.balance) : 0;
  }

  /**
   * Ensure user has a balance record (create if not exists)
   */
  async ensureBalanceRecord(userId: string): Promise<void> {
    const [existing] = await serverDB
      .select({ userId: userBalances.userId })
      .from(userBalances)
      .where(eq(userBalances.userId, userId))
      .limit(1);

    if (!existing) {
      await serverDB.insert(userBalances).values({
        balance: '0',
        userId,
      });
    }
  }
}

// Singleton instance
export const billingService = new BillingService();
