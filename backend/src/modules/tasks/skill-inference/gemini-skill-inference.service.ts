import { ApiError, type GoogleGenAI } from "@google/genai";
import {
  SkillInferenceError,
  buildSkillInferenceJsonSchema,
  parseSkillInferenceOutput,
  type SkillInferenceService,
} from "./skill-inference.js";
import { buildSkillInferenceSystemPrompt } from "./skill-inference.prompt.js";
import { retrySkillInference } from "./retry-skill-inference.js";

export interface GeminiClient {
  models: {
    generateContent(
      params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
    ): Promise<{ readonly text?: string }>;
  };
}

interface Logger {
  error(details: unknown, message: string): void;
}

export interface GeminiSkillInferenceOptions {
  apiKey?: string;
  client?: GeminiClient;
  model: string;
  timeoutMs: number;
  maxAttempts: number;
  retryDelayMs: number;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
  logger?: Logger;
}

export class GeminiSkillInferenceService implements SkillInferenceService {
  private readonly apiKey: string | undefined;
  private readonly client: GeminiClient | undefined;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly sleep: ((milliseconds: number) => Promise<void>) | undefined;
  private readonly random: (() => number) | undefined;
  private readonly logger: Logger;

  constructor(options: GeminiSkillInferenceOptions) {
    this.apiKey = options.apiKey;
    this.client = options.client;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs;
    this.maxAttempts = options.maxAttempts;
    this.retryDelayMs = options.retryDelayMs;
    this.sleep = options.sleep;
    this.random = options.random;
    this.logger = options.logger ?? console;
  }

  async inferSkills(
    title: string,
    availableSkillNames: readonly string[],
  ): Promise<string[]> {
    const client = this.client;
    if (!this.apiKey || !client) {
      const error = new SkillInferenceError(
        "NOT_CONFIGURED",
        "Skill inference is not configured",
      );
      this.logger.error({ error, model: this.model }, "Skill inference failed");
      throw error;
    }

    return retrySkillInference(
      () => this.requestInference(title, availableSkillNames, client),
      {
        provider: "Gemini",
        model: this.model,
        maxAttempts: this.maxAttempts,
        retryDelayMs: this.retryDelayMs,
        normalizeError,
        sleep: this.sleep,
        random: this.random,
        logger: this.logger,
      },
    );
  }

  private async requestInference(
    title: string,
    availableSkillNames: readonly string[],
    client: GeminiClient,
  ): Promise<string[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await client.models.generateContent({
        model: this.model,
        contents: title,
        config: {
          systemInstruction:
            buildSkillInferenceSystemPrompt(availableSkillNames),
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: buildSkillInferenceJsonSchema(availableSkillNames),
          abortSignal: controller.signal,
        },
      });

      return parseSkillInferenceOutput(
        response.text,
        "Gemini",
        availableSkillNames,
      );
    } catch (error) {
      if (controller.signal.aborted) {
        throw new SkillInferenceError(
          "TIMEOUT",
          `Skill inference timed out after ${this.timeoutMs}ms`,
          { cause: error },
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeError(error: unknown): SkillInferenceError {
  if (error instanceof SkillInferenceError) {
    return error;
  }

  if (error instanceof ApiError) {
    if (error.status === 429) {
      return new SkillInferenceError(
        "RATE_LIMITED",
        "The skill inference provider rate limit was exceeded",
        { cause: error },
      );
    }

    if (error.status === 408 || error.status >= 500) {
      return new SkillInferenceError(
        "PROVIDER_UNAVAILABLE",
        `The skill inference provider returned HTTP ${error.status}`,
        { cause: error },
      );
    }

    return new SkillInferenceError(
      "PROVIDER_REJECTED",
      `The skill inference provider rejected the request with HTTP ${error.status}: ${error.message}`,
      { cause: error },
    );
  }

  return new SkillInferenceError(
    "PROVIDER_UNAVAILABLE",
    "The skill inference provider could not be reached",
    { cause: error },
  );
}
