import {
  AGENT_RUNTIME_ERROR_SET,
  ChatCompletionErrorPayload,
  ModelRuntime,
} from '@lobechat/model-runtime';
import { ChatErrorType, ErrorType } from '@lobechat/types';

import { checkAuth } from '@/app/(backend)/middleware/auth';
import {
  createTraceOptions,
  initModelRuntimeWithAdminCredentials,
  initModelRuntimeWithUserPayload,
} from '@/server/modules/ModelRuntime';
import { adminProviderService } from '@/server/services/adminProvider';
import { billingService } from '@/server/services/billing';
import { ChatStreamPayload } from '@/types/openai/chat';
import { createErrorResponse } from '@/utils/errorResponse';
import { getTracePayload } from '@/utils/trace';

export const maxDuration = 300;

// Simple token estimation based on text length
// Average: 1 token ≈ 4 characters for English, 1 token ≈ 2 characters for Chinese
const estimateTokens = (text: string): number => {
  // Count Chinese characters
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
};

const estimateInputTokens = (messages: ChatStreamPayload['messages']): number => {
  return messages.reduce((total, msg) => {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    return total + estimateTokens(content);
  }, 0);
};

export const POST = checkAuth(async (req: Request, { params, jwtPayload, createRuntime }) => {
  const provider = (await params)!.provider!;
  const userId = jwtPayload.userId!;

  try {
    // ============  0. Check user balance (billing mode)  ============ //
    const balanceCheck = await billingService.checkBalance(userId);
    if (!balanceCheck.canProceed) {
      return createErrorResponse('InsufficientBalance' as ErrorType, {
        error: {
          balance: balanceCheck.balance,
          message: `余额不足，当前余额 ¥${balanceCheck.balance.toFixed(2)}，最低需要 ¥${balanceCheck.minThreshold.toFixed(2)}`,
          minThreshold: balanceCheck.minThreshold,
        },
        provider,
      });
    }

    // ============  1. init chat model   ============ //
    let modelRuntime: ModelRuntime;
    let useAdminCredentials = false;

    // Try to get admin credentials first
    const adminCredentials = await adminProviderService.getProviderCredentials(provider);

    if (adminCredentials) {
      // Use admin credentials (billing mode)
      modelRuntime = await initModelRuntimeWithAdminCredentials(provider, {
        apiKey: adminCredentials.apiKey,
        baseUrl: adminCredentials.baseUrl,
        sdkType: adminCredentials.sdkType,
      });
      useAdminCredentials = true;
    } else if (createRuntime) {
      // Fallback to user-provided runtime (for testing or special cases)
      modelRuntime = createRuntime(jwtPayload);
    } else {
      // Fallback to user payload
      modelRuntime = await initModelRuntimeWithUserPayload(provider, jwtPayload);
    }

    // ============  2. create chat completion   ============ //

    const data = (await req.json()) as ChatStreamPayload;
    const modelId = data.model;

    // Check if model is enabled (when using admin credentials)
    if (useAdminCredentials) {
      const isEnabled = await adminProviderService.isModelEnabled(provider, modelId);
      if (!isEnabled) {
        return createErrorResponse('ModelNotEnabled' as ErrorType, {
          error: {
            message: `模型 ${modelId} 未启用`,
            modelId,
            provider,
          },
          provider,
        });
      }
    }

    const tracePayload = getTracePayload(req);

    let traceOptions = {};
    // If user enable trace
    if (tracePayload?.enabled) {
      traceOptions = createTraceOptions(data, { provider, trace: tracePayload });
    }

    // Estimate input tokens for billing
    const inputTokens = estimateInputTokens(data.messages);

    const response = await modelRuntime.chat(data, {
      user: jwtPayload.userId,
      ...traceOptions,
      signal: req.signal,
    });

    // ============  3. Billing - deduct balance after successful response  ============ //
    if (useAdminCredentials) {
      // Estimate output tokens (use a reasonable default, actual value would need stream parsing)
      // For now, estimate based on max_tokens or a default
      const estimatedOutputTokens = data.max_tokens ? Math.min(data.max_tokens, 1000) : 500;

      // Deduct balance asynchronously (don't block the response)
      billingService
        .deductBalance(userId, provider, modelId, inputTokens, estimatedOutputTokens)
        .catch((err) => {
          console.error('Billing deduction failed:', err);
        });
    }

    return response;
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;

    const logMethod = AGENT_RUNTIME_ERROR_SET.has(errorType as string) ? 'warn' : 'error';
    // track the error at server side
    console[logMethod](`Route: [${provider}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider });
  }
});

