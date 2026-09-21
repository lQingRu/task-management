import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";

import { skillsResponseSchema, type SkillResponse } from "./skill.schema.js";
import { getSkills } from "./skill.service.js";

export type GetSkills = () => Promise<SkillResponse[]>;

interface SkillRoutesOptions {
  getSkills?: GetSkills;
}

export const skillRoutes: FastifyPluginAsync<SkillRoutesOptions> = async (
  app,
  options,
) => {
  const loadSkills = options.getSkills ?? getSkills;

  app.withTypeProvider<ZodTypeProvider>().get(
    "/v1/skills",
    {
      schema: {
        response: {
          200: skillsResponseSchema,
        },
      },
    },
    async () => loadSkills(),
  );
};
