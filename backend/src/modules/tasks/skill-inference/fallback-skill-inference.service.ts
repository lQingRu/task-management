import {
  SkillInferenceError,
  type SkillInferenceService,
} from "./skill-inference.js";

export interface SkillInferenceProvider {
  name: string;
  service: SkillInferenceService;
}

export class FallbackSkillInferenceService implements SkillInferenceService {
  constructor(private readonly providers: readonly SkillInferenceProvider[]) {}

  async inferSkills(
    title: string,
    availableSkillNames: readonly string[],
  ): Promise<string[]> {
    if (this.providers.length === 0) {
      throw new SkillInferenceError(
        "NOT_CONFIGURED",
        "No skill inference provider is configured",
      );
    }

    const failures: SkillInferenceError[] = [];

    for (const provider of this.providers) {
      try {
        return await provider.service.inferSkills(title, availableSkillNames);
      } catch (error) {
        if (!(error instanceof SkillInferenceError)) {
          throw error;
        }

        failures.push(error);
      }
    }

    if (failures.every((error) => error.code === "NOT_CONFIGURED")) {
      throw new SkillInferenceError(
        "NOT_CONFIGURED",
        "No skill inference provider is configured",
        { cause: new AggregateError(failures) },
      );
    }

    throw new SkillInferenceError(
      "PROVIDER_UNAVAILABLE",
      `All skill inference providers failed: ${this.providers
        .map(({ name }) => name)
        .join(", ")}`,
      { cause: new AggregateError(failures) },
    );
  }
}
