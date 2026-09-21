import type { DeveloperResponse } from "./developer.schema.js";
import {
  developerRepository,
  type DeveloperRepository,
} from "./developer.repository.js";

export async function getDevelopers(
  repository: DeveloperRepository = developerRepository,
): Promise<DeveloperResponse[]> {
  const developers = await repository.findAll();

  return developers.map((developer) => ({
    id: developer.id,
    name: developer.name,
    skills: developer.skills.map(({ skill }) => {
      if (skill === null) {
        throw new Error(
          `Developer ${developer.id} has an invalid skill relation`,
        );
      }

      return skill;
    }),
  }));
}
