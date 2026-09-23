import { z } from "zod";

export const skillInferenceResultSchema = z
  .object({
    skills: z.array(z.string().trim().min(1)),
  })
  .strict();

export interface SkillInferenceService {
  inferSkills(
    title: string,
    availableSkillNames: readonly string[],
  ): Promise<string[]>;
}

export type SkillInferenceErrorCode =
  | "NOT_CONFIGURED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "PROVIDER_REJECTED"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_RESPONSE";

export class SkillInferenceError extends Error {
  constructor(
    readonly code: SkillInferenceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SkillInferenceError";
  }
}

export function buildSkillInferenceJsonSchema(
  availableSkillNames: readonly string[],
) {
  return {
    type: "object",
    properties: {
      skills: {
        type: "array",
        items: {
          type: "string",
          enum: [...availableSkillNames],
        },
        minItems: 0,
        maxItems: availableSkillNames.length,
      },
    },
    required: ["skills"],
    additionalProperties: false,
  } as const;
}

export function parseSkillInferenceOutput(
  text: string | null | undefined,
  provider: string,
  availableSkillNames: readonly string[],
): string[] {
  if (!text) {
    throw new SkillInferenceError(
      "INVALID_RESPONSE",
      `${provider} returned no structured output`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new SkillInferenceError(
      "INVALID_RESPONSE",
      `${provider} returned invalid JSON`,
      { cause: error },
    );
  }

  const result = skillInferenceResultSchema.safeParse(parsed);
  const availableSkillNameSet = new Set(availableSkillNames);
  if (
    !result.success ||
    result.data.skills.length > availableSkillNames.length ||
    result.data.skills.some((name) => !availableSkillNameSet.has(name))
  ) {
    throw new SkillInferenceError(
      "INVALID_RESPONSE",
      `${provider} returned unsupported skills`,
      { cause: result.error },
    );
  }

  return [...new Set(result.data.skills)];
}
