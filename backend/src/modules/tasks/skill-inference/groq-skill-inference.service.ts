import { APIConnectionTimeoutError, APIError } from "groq-sdk";

import {
  SkillInferenceError,
  buildSkillInferenceJsonSchema,
  parseSkillInferenceOutput,
  type SkillInferenceService,
} from "./skill-inference.js";
import { buildSkillInferenceSystemPrompt } from "./skill-inference.prompt.js";
import { retrySkillInference } from "./retry-skill-inference.js";

interface GroqCompletionRequest {
  model: string;
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
  temperature: number;
  stream: false;
  response_format: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
}

interface GroqCompletionResponse {
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
}

export interface GroqClient {
  create(
    request: GroqCompletionRequest,
    options?: { signal?: AbortSignal },
  ): Promise<GroqCompletionResponse>;
}

interface Logger {
  error(details: unknown, message: string): void;
}

export interface GroqSkillInferenceOptions {
  apiKey?: string;
  client?: GroqClient;
  model: string;
  timeoutMs: number;
  maxAttempts: number;
  retryDelayMs: number;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
  logger?: Logger;
}

export class GroqSkillInferenceService implements SkillInferenceService {
  private readonly apiKey: string | undefined;
  private readonly client: GroqClient | undefined;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly sleep: ((milliseconds: number) => Promise<void>) | undefined;
  private readonly random: (() => number) | undefined;
  private readonly logger: Logger;

  constructor(options: GroqSkillInferenceOptions) {
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
        "Groq skill inference is not configured",
      );
      this.logger.error({ error, model: this.model }, "Skill inference failed");
      throw error;
    }

    return retrySkillInference(
      () => this.requestInference(title, availableSkillNames, client),
      {
        provider: "Groq",
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
    client: GroqClient,
  ): Promise<string[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await client.create(
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content: buildSkillInferenceSystemPrompt(availableSkillNames),
            },
            { role: "user", content: title },
          ],
          temperature: 0,
          stream: false,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "skill_inference",
              strict: true,
              schema: buildSkillInferenceJsonSchema(availableSkillNames),
            },
          },
        },
        { signal: controller.signal },
      );

      return parseSkillInferenceOutput(
        response.choices[0]?.message.content,
        "Groq",
        availableSkillNames,
      );
    } catch (error) {
      if (controller.signal.aborted) {
        throw new SkillInferenceError(
          "TIMEOUT",
          `Groq skill inference timed out after ${this.timeoutMs}ms`,
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

  if (error instanceof APIConnectionTimeoutError) {
    return new SkillInferenceError(
      "TIMEOUT",
      "The Groq skill inference request timed out",
      { cause: error },
    );
  }

  if (error instanceof APIError) {
    if (error.status === 429) {
      return new SkillInferenceError(
        "RATE_LIMITED",
        "The Groq skill inference rate limit was exceeded",
        { cause: error },
      );
    }

    if (
      error.status === undefined ||
      error.status === 408 ||
      error.status === 409 ||
      error.status >= 500
    ) {
      return new SkillInferenceError(
        "PROVIDER_UNAVAILABLE",
        error.status
          ? `Groq returned HTTP ${error.status}`
          : "Groq could not be reached",
        { cause: error },
      );
    }

    return new SkillInferenceError(
      "PROVIDER_REJECTED",
      `Groq rejected the request with HTTP ${error.status}: ${error.message}`,
      { cause: error },
    );
  }

  return new SkillInferenceError(
    "PROVIDER_UNAVAILABLE",
    "Groq could not be reached",
    { cause: error },
  );
}
