import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

describe("health endpoint", () => {
  it("returns ok", async () => {
    const app = buildApp({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
    });
  });
});

describe("CORS", () => {
  it("allows task updates from browser clients", async () => {
    const app = buildApp({ logger: false });

    const response = await app.inject({
      method: "OPTIONS",
      url: "/v1/tasks/11111111-1111-4111-8111-111111111111",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "PATCH",
        "access-control-request-headers": "content-type",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["access-control-allow-methods"]).toContain(
      "PATCH",
    );
  });
});
