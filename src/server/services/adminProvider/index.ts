import { adminModelConfig, adminProviderConfig, adminSettings, serverDB } from '@lobechat/database';
import { and, eq } from 'drizzle-orm';

import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';

export interface AdminProviderCredentials {
  apiKey: string;
  baseUrl: string;
  displayName: string | null;
  provider: string;
  sdkType: string | null;
}

export interface AdminModelPricing {
  inputPrice: number | null;
  modelId: string;
  multiplier: number;
  outputPrice: number | null;
  provider: string;
}

export interface AdminGlobalSettings {
  globalPriceMultiplier: number;
  minBalanceThreshold: number;
  usdToCnyRate: number;
}

const DEFAULT_SETTINGS: AdminGlobalSettings = {
  globalPriceMultiplier: 1.0,
  minBalanceThreshold: 0.01,
  usdToCnyRate: 7.3,
};

/**
 * Admin Provider Service
 * Handles retrieval of admin-configured provider credentials and model pricing
 */
export class AdminProviderService {
  /**
   * Get decrypted credentials for a specific provider
   */
  async getProviderCredentials(providerId: string): Promise<AdminProviderCredentials | null> {
    const [provider] = await serverDB
      .select()
      .from(adminProviderConfig)
      .where(
        and(eq(adminProviderConfig.provider, providerId), eq(adminProviderConfig.enabled, true)),
      )
      .limit(1);

    if (!provider) {
      return null;
    }

    // Decrypt the API key
    const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();
    const { plaintext, wasAuthentic } = await gateKeeper.decrypt(provider.apiKeyEncrypted);

    if (!wasAuthentic) {
      console.error(`Failed to decrypt API key for provider: ${providerId}`);
      return null;
    }

    return {
      apiKey: plaintext,
      baseUrl: provider.baseUrl,
      displayName: provider.displayName,
      provider: provider.provider,
      sdkType: provider.sdkType,
    };
  }

  /**
   * Get model pricing configuration
   */
  async getModelPricing(providerId: string, modelId: string): Promise<AdminModelPricing | null> {
    const [model] = await serverDB
      .select()
      .from(adminModelConfig)
      .where(
        and(
          eq(adminModelConfig.provider, providerId),
          eq(adminModelConfig.modelId, modelId),
          eq(adminModelConfig.enabled, true),
        ),
      )
      .limit(1);

    if (!model) {
      return null;
    }

    return {
      inputPrice: model.inputPrice ? Number(model.inputPrice) : null,
      modelId: model.modelId,
      multiplier: model.multiplier ? Number(model.multiplier) : 1.0,
      outputPrice: model.outputPrice ? Number(model.outputPrice) : null,
      provider: model.provider,
    };
  }

  /**
   * Check if a model is enabled for use
   */
  async isModelEnabled(providerId: string, modelId: string): Promise<boolean> {
    const [model] = await serverDB
      .select({ enabled: adminModelConfig.enabled })
      .from(adminModelConfig)
      .where(and(eq(adminModelConfig.provider, providerId), eq(adminModelConfig.modelId, modelId)))
      .limit(1);

    return model?.enabled ?? false;
  }

  /**
   * Get global admin settings
   */
  async getGlobalSettings(): Promise<AdminGlobalSettings> {
    const settings = await serverDB.select().from(adminSettings);

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    return {
      globalPriceMultiplier:
        (settingsMap.get('global_price_multiplier') as { value?: number })?.value ??
        DEFAULT_SETTINGS.globalPriceMultiplier,
      minBalanceThreshold:
        (settingsMap.get('min_balance_threshold') as { value?: number })?.value ??
        DEFAULT_SETTINGS.minBalanceThreshold,
      usdToCnyRate:
        (settingsMap.get('usd_to_cny_rate') as { value?: number })?.value ??
        DEFAULT_SETTINGS.usdToCnyRate,
    };
  }

  /**
   * Calculate the cost of an AI request in CNY
   * @param providerId Provider ID
   * @param modelId Model ID
   * @param inputTokens Number of input tokens
   * @param outputTokens Number of output tokens
   * @returns Cost in CNY
   */
  async calculateCost(
    providerId: string,
    modelId: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<number> {
    const [pricing, settings] = await Promise.all([
      this.getModelPricing(providerId, modelId),
      this.getGlobalSettings(),
    ]);

    if (!pricing) {
      // If no pricing configured, use a minimal default
      console.warn(`No pricing found for ${providerId}/${modelId}, using default`);
      return 0;
    }

    // Prices are in USD per 1M tokens
    const inputPricePerToken = (pricing.inputPrice ?? 0) / 1_000_000;
    const outputPricePerToken = (pricing.outputPrice ?? 0) / 1_000_000;

    // Calculate cost in USD
    const costUSD =
      (inputTokens * inputPricePerToken + outputTokens * outputPricePerToken) *
      pricing.multiplier *
      settings.globalPriceMultiplier;

    // Convert to CNY
    const costCNY = costUSD * settings.usdToCnyRate;

    return costCNY;
  }
}

// Singleton instance
export const adminProviderService = new AdminProviderService();
