import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  serializerCompiler,
  validatorCompiler,
} from "@fastify/type-provider-zod";

import {
  developerRoutes,
  type GetDevelopers,
} from "./modules/developers/developer.routes.js";
import { skillRoutes, type GetSkills } from "./modules/skills/skill.routes.js";

interface AppServices {
  getDevelopers?: GetDevelopers;
  getSkills?: GetSkills;
}

interface BuildAppOptions {
  logger?: boolean;
  services?: AppServices;
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
    origin: true,
  });

  app.get("/health", async () => {
    return {
      status: "ok",
    };
  });

  app.register(developerRoutes, {
    getDevelopers: options.services?.getDevelopers,
  });
  app.register(skillRoutes, {
    getSkills: options.services?.getSkills,
  });

  return app;
}
