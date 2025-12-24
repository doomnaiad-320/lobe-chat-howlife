/* eslint-disable sort-keys-fix/sort-keys-fix */
import { numeric, pgTable, text } from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from './_helpers';
import { users } from './user';

export const userBalances = pgTable('user_balances', {
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey(),

  // 当前余额
  balance: numeric('balance', { precision: 10, scale: 2 }).notNull().default('0'),
  // 累计充值
  totalRecharged: numeric('total_recharged', { precision: 10, scale: 2 }).notNull().default('0'),
  // 累计消费
  totalUsed: numeric('total_used', { precision: 10, scale: 2 }).notNull().default('0'),

  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type NewUserBalance = typeof userBalances.$inferInsert;
export type UserBalanceItem = typeof userBalances.$inferSelect;
