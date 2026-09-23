import {
  SUPPORTED_SKILL_DESCRIPTIONS,
  SUPPORTED_SKILL_NAMES,
} from './skill-inference.js';

const skillDescriptions = SUPPORTED_SKILL_NAMES.map(
  (name) => `- ${name}: ${SUPPORTED_SKILL_DESCRIPTIONS[name]}.`,
).join('\n');

export const SKILL_INFERENCE_SYSTEM_PROMPT = `You classify the skills required to complete a task based on its title.

Allowed skills:
${skillDescriptions}

Rules:
- Select only skills clearly relevant to the task title.
- Do not guess or select the closest match.
- If the title is vague, unrelated, or meaningless, return no skills.
- Only select from the allowed skills.
`;
