import { env } from "./env.js";

export const llmConfig = {
  gemini: {
    apiKey: env.LLM_API_KEY,
    model: env.LLM_MODEL,
    timeoutMs: env.LLM_TIMEOUT_MS,
    maxAttempts: env.LLM_MAX_ATTEMPTS,
    retryDelayMs: env.LLM_DEFAULT_RETRY_DELAY_MS,
  },
  groq: {
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_MODEL,
    timeoutMs: env.LLM_TIMEOUT_MS,
    maxAttempts: env.LLM_MAX_ATTEMPTS,
    retryDelayMs: env.LLM_DEFAULT_RETRY_DELAY_MS,
  },
} as const;
