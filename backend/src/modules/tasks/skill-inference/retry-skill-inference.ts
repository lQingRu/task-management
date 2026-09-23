import {
  SkillInferenceError,
  type SupportedSkillName,
} from "./skill-inference.js";

interface Logger {
  error(details: unknown, message: string): void;
}

export interface SkillInferenceRetryOptions {
  provider: string;
  model: string;
  maxAttempts: number;
  retryDelayMs: number;
  normalizeError(error: unknown): SkillInferenceError;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
  logger?: Logger;
}

export async function retrySkillInference(
  operation: () => Promise<SupportedSkillName[]>,
  options: SkillInferenceRetryOptions,
): Promise<SupportedSkillName[]> {
  const sleep = options.sleep ?? delay;
  const random = options.random ?? Math.random;
  const logger = options.logger ?? console;
  let lastError: SkillInferenceError | undefined;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const inferenceError = options.normalizeError(error);
      lastError = inferenceError;

      if (!isRetryable(inferenceError) || attempt === options.maxAttempts) {
        logger.error(
          {
            error: inferenceError,
            attempt,
            maxAttempts: options.maxAttempts,
            model: options.model,
            provider: options.provider,
          },
          "Skill inference provider failed",
        );
        throw inferenceError;
      }

      const backoffMs = options.retryDelayMs * 2 ** (attempt - 1);
      const jitteredDelayMs = Math.round(backoffMs * (0.5 + random()));
      await sleep(jitteredDelayMs);
    }
  }

  throw lastError!;
}

function isRetryable(error: SkillInferenceError): boolean {
  return (
    error.code === "TIMEOUT" ||
    error.code === "RATE_LIMITED" ||
    error.code === "PROVIDER_UNAVAILABLE"
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
