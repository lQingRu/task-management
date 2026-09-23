import { z } from 'zod';

export const SUPPORTED_SKILL_NAMES = ['Frontend', 'Backend'] as const;

export const SUPPORTED_SKILL_DESCRIPTIONS: Record<
  (typeof SUPPORTED_SKILL_NAMES)[number],
  string
> = {
  Frontend:
    'browser UI, styling, accessibility, client-side interactions, or frontend application code',
  Backend:
    'APIs, databases, server-side logic, integrations, infrastructure, or backend application code',
};

export const supportedSkillNameSchema = z.enum(SUPPORTED_SKILL_NAMES);

export const skillInferenceResultSchema = z
  .object({
    skills: z.array(supportedSkillNameSchema).min(0).max(2),
  })
  .strict();

export const SKILL_INFERENCE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    skills: {
      type: 'array',
      items: {
        type: 'string',
        enum: [...SUPPORTED_SKILL_NAMES],
      },
      minItems: 0,
      maxItems: SUPPORTED_SKILL_NAMES.length,
    },
  },
  required: ['skills'],
  additionalProperties: false,
} as const;

export type SupportedSkillName = z.infer<typeof supportedSkillNameSchema>;

export interface SkillInferenceService {
  inferSkills(title: string): Promise<SupportedSkillName[]>;
}

export type SkillInferenceErrorCode =
  | 'NOT_CONFIGURED'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'PROVIDER_REJECTED'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_RESPONSE';

export class SkillInferenceError extends Error {
  constructor(
    readonly code: SkillInferenceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SkillInferenceError';
  }
}

export function parseSkillInferenceOutput(
  text: string | null | undefined,
  provider: string,
): SupportedSkillName[] {
  if (!text) {
    throw new SkillInferenceError(
      'INVALID_RESPONSE',
      `${provider} returned no structured output`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new SkillInferenceError(
      'INVALID_RESPONSE',
      `${provider} returned invalid JSON`,
      { cause: error },
    );
  }

  const result = skillInferenceResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new SkillInferenceError(
      'INVALID_RESPONSE',
      `${provider} returned unsupported skills`,
      { cause: result.error },
    );
  }

  return [...new Set(result.data.skills)];
}
