import { db } from "../../prisma/db.js";

export interface DeveloperRecord {
  id: string;
  name: string;
  skills: Array<{
    skill: {
      id: string;
      name: string;
    } | null;
  }>;
}

export interface DeveloperRepository {
  findAll(): Promise<DeveloperRecord[]>;
}

export const developerRepository: DeveloperRepository = {
  async findAll() {
    return db.orm.public.Developer.select("id", "name")
      .include("skills", (developerSkills) =>
        developerSkills.include("skill", (skill) => skill.select("id", "name")),
      )
      .orderBy((developer) => developer.name.asc())
      .all();
  },
};
