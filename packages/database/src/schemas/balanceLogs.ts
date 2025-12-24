/* eslint-disable sort-keys-fix/sort-keys-fix */
import { numeric, pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';

import { createdAt } from './_helpers';
import { users } from './user';

/**
 * 余额变动类型
 */
export type BalanceLogType = 'recharge' | 'consume' | 'deduct' | 'refund' | 'adjust';

export const balanceLogs = pgTable('balance_logs', {
  id: serial('id').primaryKey(),

  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  // 变动类型: recharge(充值), consume(消费), deduct(扣减), refund(退款), adjust(调整)
  type: varchar('type', { length: 20 }).notNull(),

  // 变动金额 (正数为增加，负数为减少)
  amount: numeric('amount', { precision: 10, scale: 4 }).notNull(),

  // 变动前余额
  balanceBefore: numeric('balance_before', { precision: 10, scale: 4 }).notNull(),

  // 变动后余额
  balanceAfter: numeric('balance_after', { precision: 10, scale: 4 }).notNull(),

  // 变动描述
  description: text('description'),

  // 关联的请求ID (消费时记录)
  relatedRequestId: text('related_request_id'),

  // 操作人 (管理员操作时记录)
  operatorId: text('operator_id'),

  createdAt: createdAt(),
});

export type NewBalanceLog = typeof balanceLogs.$inferInsert;
export type BalanceLogItem = typeof balanceLogs.$inferSelect;
