import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../../app.js";

describe("GET /v1/developers", () => {
  it("returns developers with their skills", async () => {
    const getDevelopers = vi.fn().mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Alice",
        skills: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Frontend",
          },
        ],
      },
    ]);
    const app = buildApp({ logger: false, services: { getDevelopers } });

    const response = await app.inject({ method: "GET", url: "/v1/developers" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Alice",
        skills: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Frontend",
          },
        ],
      },
    ]);
    expect(getDevelopers).toHaveBeenCalledOnce();
  });

  it("returns an empty list when no developers exist", async () => {
    const app = buildApp({
      logger: false,
      services: { getDevelopers: async () => [] },
    });

    const response = await app.inject({ method: "GET", url: "/v1/developers" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});
