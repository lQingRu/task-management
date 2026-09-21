import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";

import {
  developersResponseSchema,
  type DeveloperResponse,
} from "./developer.schema.js";
import { getDevelopers } from "./developer.service.js";

export type GetDevelopers = () => Promise<DeveloperResponse[]>;

interface DeveloperRoutesOptions {
  getDevelopers?: GetDevelopers;
}

export const developerRoutes: FastifyPluginAsync<
  DeveloperRoutesOptions
> = async (app, options) => {
  const loadDevelopers = options.getDevelopers ?? getDevelopers;

  app.withTypeProvider<ZodTypeProvider>().get(
    "/v1/developers",
    {
      schema: {
        response: {
          200: developersResponseSchema,
        },
      },
    },
    async () => loadDevelopers(),
  );
};
