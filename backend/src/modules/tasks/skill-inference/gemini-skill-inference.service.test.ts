import { ApiError } from "@google/genai";
import { describe, expect, it, vi } from "vitest";

import {
  GeminiSkillInferenceService,
  type GeminiClient,
} from "./gemini-skill-inference.service.js";

function geminiResponse(skills: string[]) {
  return { text: JSON.stringify({ skills }) };
}

type GenerateContent = GeminiClient["models"]["generateContent"];

function createClient(generateContent: GenerateContent): GeminiClient {
  return { models: { generateContent } };
}

describe("GeminiSkillInferenceService", () => {
  const availableSkills = ["Backend", "Frontend", "DevOps"];

  it("requests structured output and returns validated supported skills", async () => {
    const generateContent = vi
      .fn<GenerateContent>()
      .mockResolvedValue(geminiResponse(["Frontend", "Backend"]));
    const service = new GeminiSkillInferenceService({
      apiKey: "test-key",
      client: createClient(generateContent),
      model: "test-model",
      timeoutMs: 5_000,
      maxAttempts: 1,
      retryDelayMs: 250,
      logger: { error: vi.fn() },
    });

    await expect(
      service.inferSkills("Build a full-stack dashboard", availableSkills),
    ).resolves.toEqual(["Frontend", "Backend"]);

    expect(generateContent).toHaveBeenCalledOnce();
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        contents: "Build a full-stack dashboard",
        config: expect.objectContaining({
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: expect.objectContaining({
            properties: expect.objectContaining({
              skills: expect.objectContaining({
                items: expect.objectContaining({
                  enum: availableSkills,
                }),
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("rejects unsupported skills before they can be persisted", async () => {
    const logger = { error: vi.fn() };
    const service = new GeminiSkillInferenceService({
      apiKey: "test-key",
      client: createClient(
        vi.fn<GenerateContent>().mockResolvedValue(geminiResponse(["DevOps"])),
      ),
      model: "test-model",
      timeoutMs: 5_000,
      maxAttempts: 1,
      retryDelayMs: 250,
      logger,
    });

    await expect(
      service.inferSkills("Deploy the service", ["Frontend", "Backend"]),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("retries a rate-limited request with an injected deterministic delay", async () => {
    const generateContent = vi
      .fn<GenerateContent>()
      .mockRejectedValueOnce(
        new ApiError({ status: 429, message: "Resource exhausted" }),
      )
      .mockResolvedValueOnce(geminiResponse(["Backend"]));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const service = new GeminiSkillInferenceService({
      apiKey: "test-key",
      client: createClient(generateContent),
      model: "test-model",
      timeoutMs: 5_000,
      sleep,
      random: () => 0.5,
      maxAttempts: 2,
      retryDelayMs: 250,
      logger: { error: vi.fn() },
    });

    await expect(
      service.inferSkills("Build an API", availableSkills),
    ).resolves.toEqual(["Backend"]);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it("does not retry a rejected request", async () => {
    const generateContent = vi
      .fn<GenerateContent>()
      .mockRejectedValue(
        new ApiError({ status: 400, message: "Invalid request schema" }),
      );
    const sleep = vi.fn();
    const service = new GeminiSkillInferenceService({
      apiKey: "test-key",
      client: createClient(generateContent),
      model: "test-model",
      timeoutMs: 5_000,
      sleep,
      maxAttempts: 2,
      retryDelayMs: 250,
      logger: { error: vi.fn() },
    });

    await expect(
      service.inferSkills("Build an API", availableSkills),
    ).rejects.toMatchObject({
      code: "PROVIDER_REJECTED",
      message: expect.stringContaining("Invalid request schema"),
    });
    expect(generateContent).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });
});
