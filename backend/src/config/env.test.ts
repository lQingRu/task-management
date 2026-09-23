import { describe, expect, it } from "vitest";

import { parseEnv, requireRuntimeEnv } from "./env.js";

describe("environment configuration", () => {
  it("applies application defaults in one place", () => {
    expect(parseEnv({})).toEqual({
      PORT: 3001,
      LLM_MODEL: "gemini-3.1-flash-lite",
      LLM_TIMEOUT_MS: 5_000,
      LLM_MAX_ATTEMPTS: 2,
      LLM_DEFAULT_RETRY_DELAY_MS: 250,
      GROQ_MODEL: "openai/gpt-oss-20b",
    });
  });

  it("coerces numeric environment values", () => {
    expect(
      parseEnv({
        PORT: "4000",
        LLM_TIMEOUT_MS: "2500",
        LLM_MAX_ATTEMPTS: "3",
      }),
    ).toMatchObject({
      PORT: 4000,
      LLM_TIMEOUT_MS: 2_500,
      LLM_MAX_ATTEMPTS: 3,
    });
  });

  it("rejects invalid operational values", () => {
    expect(() => parseEnv({ LLM_TIMEOUT_MS: "0" })).toThrow();
    expect(() => parseEnv({ LLM_MAX_ATTEMPTS: "not-a-number" })).toThrow();
  });

  it("requires deployment secrets at application startup", () => {
    expect(() => requireRuntimeEnv({})).toThrow();
    expect(
      requireRuntimeEnv({
        DATABASE_URL: "postgresql://localhost:5432/task_assignment",
        LLM_API_KEY: "test-key",
      }),
    ).toMatchObject({
      DATABASE_URL: "postgresql://localhost:5432/task_assignment",
      LLM_API_KEY: "test-key",
    });

    expect(
      requireRuntimeEnv({
        DATABASE_URL: "postgresql://localhost:5432/task_assignment",
        GROQ_API_KEY: "test-groq-key",
      }),
    ).toMatchObject({
      DATABASE_URL: "postgresql://localhost:5432/task_assignment",
      GROQ_API_KEY: "test-groq-key",
    });
  });
});
