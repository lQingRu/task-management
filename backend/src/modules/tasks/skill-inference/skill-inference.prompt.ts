import { readFileSync } from "node:fs";

import { env } from "../../../config/env.js";

const AVAILABLE_SKILLS_TOKEN = "{{AVAILABLE_SKILLS}}";

export function buildSkillInferenceSystemPrompt(
  availableSkillNames: readonly string[],
): string {
  const skillList = availableSkillNames.map((name) => `- ${name}`).join("\n");

  const template =
    env.SKILL_INFERENCE_SYSTEM_PROMPT ??
    readFileSync(env.SKILL_INFERENCE_SYSTEM_PROMPT_FILE, "utf8");

  if (!template.includes(AVAILABLE_SKILLS_TOKEN)) {
    throw new Error(
      `Skill inference prompt must contain ${AVAILABLE_SKILLS_TOKEN}`,
    );
  }

  return template.replaceAll(AVAILABLE_SKILLS_TOKEN, skillList);
}
