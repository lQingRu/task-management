import { describe, expect, it } from "vitest";

import { getDevelopers } from "./developer.service.js";

describe("getDevelopers", () => {
  it("maps developer-skill join records to API skills", async () => {
    const developers = await getDevelopers({
      async findAll() {
        return [
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Carol",
            skills: [
              {
                skill: {
                  id: "22222222-2222-4222-8222-222222222222",
                  name: "Frontend",
                },
              },
              {
                skill: {
                  id: "33333333-3333-4333-8333-333333333333",
                  name: "Backend",
                },
              },
            ],
          },
        ];
      },
    });

    expect(developers).toEqual([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Carol",
        skills: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Frontend",
          },
          {
            id: "33333333-3333-4333-8333-333333333333",
            name: "Backend",
          },
        ],
      },
    ]);
  });
});
