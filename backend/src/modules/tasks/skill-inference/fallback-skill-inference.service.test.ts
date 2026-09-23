import { describe, expect, it, vi } from "vitest";

import { FallbackSkillInferenceService } from "./fallback-skill-inference.service.js";
import {
  SkillInferenceError,
  type SkillInferenceService,
} from "./skill-inference.js";

function provider(
  inferSkills: SkillInferenceService["inferSkills"],
): SkillInferenceService {
  return { inferSkills };
}

describe("FallbackSkillInferenceService", () => {
  it("reports that inference is not configured when no providers are enabled", async () => {
    const service = new FallbackSkillInferenceService([]);

    await expect(service.inferSkills("Build an API")).rejects.toMatchObject({
      code: "NOT_CONFIGURED",
    });
  });

  it("returns the primary provider result without calling the fallback", async () => {
    const primary = vi.fn().mockResolvedValue(["Frontend"]);
    const fallback = vi.fn().mockResolvedValue(["Backend"]);
    const service = new FallbackSkillInferenceService([
      { name: "Gemini", service: provider(primary) },
      { name: "Groq", service: provider(fallback) },
    ]);

    await expect(service.inferSkills("Build the UI")).resolves.toEqual([
      "Frontend",
    ]);
    expect(primary).toHaveBeenCalledOnce();
    expect(fallback).not.toHaveBeenCalled();
  });

  it("falls back to Gemini when Groq is unavailable", async () => {
    const primary = vi
      .fn()
      .mockRejectedValue(
        new SkillInferenceError(
          "PROVIDER_UNAVAILABLE",
          "Groq returned HTTP 503",
        ),
      );
    const fallback = vi.fn().mockResolvedValue(["Backend"]);
    const service = new FallbackSkillInferenceService([
      { name: "Groq", service: provider(primary) },
      { name: "Gemini", service: provider(fallback) },
    ]);

    await expect(service.inferSkills("Build an API")).resolves.toEqual([
      "Backend",
    ]);
    expect(primary).toHaveBeenCalledWith("Build an API");
    expect(fallback).toHaveBeenCalledWith("Build an API");
    expect(primary.mock.invocationCallOrder[0]).toBeLessThan(
      fallback.mock.invocationCallOrder[0]!,
    );
  });

  it("reports a single failure after all configured providers fail", async () => {
    const service = new FallbackSkillInferenceService([
      {
        name: "Groq",
        service: provider(
          vi
            .fn()
            .mockRejectedValue(
              new SkillInferenceError("RATE_LIMITED", "Groq overloaded"),
            ),
        ),
      },
      {
        name: "Gemini",
        service: provider(
          vi
            .fn()
            .mockRejectedValue(
              new SkillInferenceError(
                "PROVIDER_UNAVAILABLE",
                "Gemini unavailable",
              ),
            ),
        ),
      },
    ]);

    await expect(service.inferSkills("Build an API")).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      message: "All skill inference providers failed: Groq, Gemini",
    });
  });

  it("does not hide unexpected programming errors", async () => {
    const fallback = vi.fn();
    const service = new FallbackSkillInferenceService([
      {
        name: "Groq",
        service: provider(vi.fn().mockRejectedValue(new TypeError("bug"))),
      },
      { name: "Gemini", service: provider(fallback) },
    ]);

    await expect(service.inferSkills("Build an API")).rejects.toThrow("bug");
    expect(fallback).not.toHaveBeenCalled();
  });
});
