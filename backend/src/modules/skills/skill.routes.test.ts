import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../../app.js";

describe("GET /v1/skills", () => {
  it("returns the available skills", async () => {
    const getSkills = vi.fn().mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Backend",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Frontend",
      },
    ]);
    const app = buildApp({ logger: false, services: { getSkills } });

    const response = await app.inject({ method: "GET", url: "/v1/skills" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Backend",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Frontend",
      },
    ]);
    expect(getSkills).toHaveBeenCalledOnce();
  });

  it("returns an empty list when no skills exist", async () => {
    const app = buildApp({
      logger: false,
      services: { getSkills: async () => [] },
    });

    const response = await app.inject({ method: "GET", url: "/v1/skills" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});
