// src/lib/ai/claude-client.ts
import Anthropic from '@anthropic-ai/sdk';
import createLogger from '@/lib/logger';

const log = createLogger('Claude');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export const MODELS = {
  DEFAULT: 'claude-sonnet-4-20250514',
  FAST: 'claude-haiku-3-5-20241022',
} as const;

export interface ErrorClassification {
  isTemporary: boolean;
  shouldRetry: boolean;
  retryAfter?: number;
  userMessage: string;
}

export function classifyError(error: any): ErrorClassification {
  const errorStatus = error.status || error.statusCode;
  const errorMessage = error.message || String(error);

  if (errorStatus === 529 || errorStatus === 503 || errorStatus === 429) {
    return {
      isTemporary: true,
      shouldRetry: true,
      retryAfter: errorStatus === 429 ? 60 : 10,
      userMessage: 'Estou processando sua pergunta, mas preciso de um momento. Vou tentar novamente em alguns segundos.'
    };
  }

  if (errorMessage.includes('timeout') || errorMessage === 'Claude timeout') {
    return {
      isTemporary: true,
      shouldRetry: true,
      retryAfter: 5,
      userMessage: 'Estou processando sua pergunta, mas preciso de um momento. Vou tentar novamente em alguns segundos.'
    };
  }

  if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('network')) {
    return {
      isTemporary: true,
      shouldRetry: true,
      retryAfter: 3,
      userMessage: 'Estou processando sua pergunta, mas preciso de um momento. Vou tentar novamente em alguns segundos.'
    };
  }

  if (errorStatus === 401 || errorStatus === 403 || errorStatus === 400) {
    return {
      isTemporary: false,
      shouldRetry: false,
      userMessage: 'Não consegui processar sua solicitação no momento. Por favor, tente novamente mais tarde ou reformule sua pergunta.'
    };
  }

  return {
    isTemporary: true,
    shouldRetry: true,
    retryAfter: 5,
    userMessage: 'Estou processando sua pergunta, mas preciso de um momento. Vou tentar novamente em alguns segundos.'
  };
}

export interface ClaudeCallParams {
  model?: string;
  max_tokens?: number;
  system: string;
  messages: any[];
  tools?: any[];
  temperature?: number;
}

export async function callClaude(
  params: ClaudeCallParams,
  maxRetries = 4,
  timeoutMs = 45000
): Promise<Anthropic.Message> {
  const model = params.model || MODELS.DEFAULT;
  const max_tokens = params.max_tokens || 2048;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const claudePromise = anthropic.messages.create({
        model,
        max_tokens,
        system: params.system,
        messages: params.messages,
        tools: params.tools,
        temperature: params.temperature ?? (params.tools && params.tools.length > 0 ? 0 : 0.3),
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Claude timeout')), timeoutMs);
      });

      const response = await Promise.race([claudePromise, timeoutPromise]);
      return response as Anthropic.Message;
    } catch (error: any) {
      log.warn(`Tentativa ${attempt}/${maxRetries} falhou`, error.message);

      const errorInfo = classifyError(error);

      if (!errorInfo.shouldRetry || attempt >= maxRetries) {
        throw error;
      }

      const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 20000);
      log.info(`Aguardando ${waitTime}ms antes da tentativa ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new Error('Todas as tentativas falharam');
}

// Helper: extrair texto da resposta do Claude
export function extractTextFromResponse(response: Anthropic.Message): string {
  let text = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      text += block.text;
    }
  }
  return text;
}

// Helper: verificar se resposta tem tool_use
export function hasToolUse(response: Anthropic.Message): boolean {
  return response.stop_reason === 'tool_use';
}

// Helper: extrair tool use blocks
export function getToolUseBlocks(response: Anthropic.Message): any[] {
  return response.content.filter((block: any) => block.type === 'tool_use');
}
