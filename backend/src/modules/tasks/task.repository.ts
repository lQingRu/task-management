import { db } from "../../prisma/db.js";

export interface SkillRecord {
  id: string;
  name: string;
}

export interface DeveloperRecord {
  id: string;
  name: string;
  skills: Array<{ skillId: string }>;
}

export interface NewTaskRecord {
  title: string;
  skillIds: string[];
  assigneeId: string | null;
  parentId: string | null;
}

export interface CreatedTaskRecord {
  id: string;
  title: string;
  status: "TODO" | "DONE";
  parentId: string | null;
}

export interface TaskRepository {
  findSkillsByIds(skillIds: string[]): Promise<SkillRecord[]>;
  findDeveloperById(developerId: string): Promise<DeveloperRecord | null>;
  taskExists(taskId: string): Promise<boolean>;
  create(input: NewTaskRecord): Promise<CreatedTaskRecord>;
}

export const taskRepository: TaskRepository = {
  async findSkillsByIds(skillIds) {
    if (skillIds.length === 0) {
      return [];
    }

    return db.orm.public.Skill.where((skill) => skill.id.in(skillIds))
      .select("id", "name")
      .all();
  },

  async findDeveloperById(developerId) {
    return db.orm.public.Developer.where({ id: developerId })
      .select("id", "name")
      .include("skills", (developerSkills) => developerSkills.select("skillId"))
      .first();
  },

  async taskExists(taskId) {
    const task = await db.orm.public.Task.where({ id: taskId })
      .select("id")
      .first();

    return task !== null;
  },

  async create(input) {
    return db.transaction(async (transaction) => {
      const task = await transaction.orm.public.Task.select(
        "id",
        "title",
        "status",
        "parentId",
      ).create({
        title: input.title,
        assigneeId: input.assigneeId,
        parentId: input.parentId,
      });

      if (input.skillIds.length > 0) {
        await transaction.orm.public.TaskSkill.createAll(
          input.skillIds.map((skillId) => ({
            taskId: task.id,
            skillId,
          })),
        );
      }

      return task;
    });
  },
};
