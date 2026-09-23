import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url().optional(),
  PORT: z.coerce.number().int().positive().default(3001),
  LLM_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().min(1).default("gemini-3.1-flash-lite"),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  LLM_MAX_ATTEMPTS: z.coerce.number().int().positive().default(2),
  LLM_DEFAULT_RETRY_DELAY_MS: z.coerce.number().int().positive().default(250),
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_MODEL: z.string().min(1).default("openai/gpt-oss-20b"),
});

const runtimeEnvSchema = envSchema
  .extend({
    DATABASE_URL: z.url(),
  })
  .refine((value) => value.LLM_API_KEY || value.GROQ_API_KEY, {
    message: "At least one LLM provider API key must be configured",
    path: ["LLM_API_KEY"],
  });

export type Environment = z.infer<typeof envSchema>;
export type RuntimeEnvironment = z.infer<typeof runtimeEnvSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Environment {
  return envSchema.parse(source);
}

export function requireRuntimeEnv(
  source: NodeJS.ProcessEnv = process.env,
): RuntimeEnvironment {
  return runtimeEnvSchema.parse(source);
}

export const env = parseEnv(process.env);
