import { APIError } from "groq-sdk";
import { describe, expect, it, vi } from "vitest";

import {
  GroqSkillInferenceService,
  type GroqClient,
} from "./groq-skill-inference.service.js";

type CreateCompletion = GroqClient["create"];

function groqResponse(skills: string[]) {
  return {
    choices: [{ message: { content: JSON.stringify({ skills }) } }],
  };
}

function createService(
  create: CreateCompletion,
  overrides: Partial<
    ConstructorParameters<typeof GroqSkillInferenceService>[0]
  > = {},
) {
  return new GroqSkillInferenceService({
    apiKey: "test-key",
    client: { create },
    model: "openai/gpt-oss-20b",
    timeoutMs: 5_000,
    maxAttempts: 1,
    retryDelayMs: 250,
    logger: { error: vi.fn() },
    ...overrides,
  });
}

describe("GroqSkillInferenceService", () => {
  it("requests strict structured output and validates supported skills", async () => {
    const create = vi
      .fn<CreateCompletion>()
      .mockResolvedValue(groqResponse(["Frontend", "Backend"]));
    const service = createService(create);

    await expect(
      service.inferSkills("Build a full-stack dashboard"),
    ).resolves.toEqual(["Frontend", "Backend"]);

    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-oss-20b",
        messages: expect.arrayContaining([
          { role: "user", content: "Build a full-stack dashboard" },
        ]),
        temperature: 0,
        stream: false,
        response_format: {
          type: "json_schema",
          json_schema: expect.objectContaining({
            name: "skill_inference",
            strict: true,
            schema: expect.objectContaining({
              required: ["skills"],
              additionalProperties: false,
            }),
          }),
        },
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("retries a 503 response using deterministic application backoff", async () => {
    const create = vi
      .fn<CreateCompletion>()
      .mockRejectedValueOnce(
        APIError.generate(
          503,
          { error: { message: "Service unavailable" } },
          "Service unavailable",
          new Headers(),
        ),
      )
      .mockResolvedValueOnce(groqResponse(["Backend"]));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const service = createService(create, {
      maxAttempts: 2,
      sleep,
      random: () => 0.5,
    });

    await expect(service.inferSkills("Build an API")).resolves.toEqual([
      "Backend",
    ]);
    expect(create).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it("does not retry a rejected request", async () => {
    const create = vi
      .fn<CreateCompletion>()
      .mockRejectedValue(
        APIError.generate(
          400,
          { error: { message: "Invalid schema" } },
          "Invalid schema",
          new Headers(),
        ),
      );
    const sleep = vi.fn();
    const service = createService(create, { maxAttempts: 2, sleep });

    await expect(service.inferSkills("Build an API")).rejects.toMatchObject({
      code: "PROVIDER_REJECTED",
      message: expect.stringContaining("Invalid schema"),
    });
    expect(create).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });
});
