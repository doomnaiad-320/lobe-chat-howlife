/* eslint-disable sort-keys-fix/sort-keys-fix */
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  varchar,
} from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from './_helpers';

/**
 * Admin Provider Config Table
 * Stores API keys and base URLs for AI providers (encrypted)
 * This is admin-level configuration, not per-user
 */
export const adminProviderConfig = pgTable('admin_provider_config', {
  id: serial('id').primaryKey(),

  // Provider identifier (e.g., 'openai', 'anthropic', 'custom-xxx')
  provider: varchar('provider', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 200 }),

  // Credentials (encrypted)
  baseUrl: text('base_url').notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),

  // SDK type for request format (e.g., 'openai', 'anthropic', 'azure', 'router')
  // 'router' is for NewAPI format
  sdkType: varchar('sdk_type', { length: 50 }).default('openai'),

  // Status
  enabled: boolean('enabled').default(true),
  sort: integer('sort').default(0),

  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type NewAdminProviderConfig = typeof adminProviderConfig.$inferInsert;
export type AdminProviderConfigItem = typeof adminProviderConfig.$inferSelect;

/**
 * Admin Model Config Table
 * Stores model configurations with pricing (admin-controlled)
 */
export const adminModelConfig = pgTable('admin_model_config', {
  id: serial('id').primaryKey(),

  // Provider reference
  provider: varchar('provider', { length: 100 }).notNull(),
  modelId: varchar('model_id', { length: 200 }).notNull(),
  displayName: varchar('display_name', { length: 200 }),
  description: text('description'),

  // Model type
  type: varchar('type', { length: 20 }).default('chat'),

  // Model abilities
  abilityFunctionCall: boolean('ability_function_call').default(false),
  abilityVision: boolean('ability_vision').default(false),
  abilityReasoning: boolean('ability_reasoning').default(false),
  abilitySearch: boolean('ability_search').default(false),
  abilityImageOutput: boolean('ability_image_output').default(false),
  abilityVideo: boolean('ability_video').default(false),

  // Context configuration
  contextWindowTokens: integer('context_window_tokens'),
  maxOutputTokens: integer('max_output_tokens'),

  // Pricing (USD per million tokens)
  // NULL means use default price from model-bank × multiplier
  inputPrice: numeric('input_price', { precision: 20, scale: 10 }),
  outputPrice: numeric('output_price', { precision: 20, scale: 10 }),
  multiplier: numeric('multiplier', { precision: 5, scale: 2 }).default('1.0'),

  // Source identifier
  isCustom: boolean('is_custom').default(false),

  // Status
  enabled: boolean('enabled').default(true),
  sort: integer('sort').default(0),

  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type NewAdminModelConfig = typeof adminModelConfig.$inferInsert;
export type AdminModelConfigItem = typeof adminModelConfig.$inferSelect;

/**
 * Admin Settings Table
 * Stores global settings as key-value pairs
 */
export const adminSettings = pgTable('admin_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: updatedAt(),
});

export type NewAdminSettings = typeof adminSettings.$inferInsert;
export type AdminSettingsItem = typeof adminSettings.$inferSelect;

/**
 * Default settings keys:
 * - global_price_multiplier: { value: 1.5 } - Global price multiplier
 * - min_balance_threshold: { value: 0.01 } - Minimum balance threshold (CNY)
 * - currency: { code: 'CNY', symbol: '¥' } - Currency settings
 * - usd_to_cny_rate: { value: 7.3 } - USD to CNY exchange rate
 */
