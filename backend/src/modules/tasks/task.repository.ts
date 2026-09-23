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
  subtasks: NewTaskRecord[];
}

export interface CreatedTaskRecord {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  parentId: string | null;
}

export interface CreatedTaskTreeRecord extends CreatedTaskRecord {
  subtasks: CreatedTaskTreeRecord[];
}

export interface TaskRecord extends CreatedTaskRecord {
  assignee: {
    id: string;
    name: string;
  } | null;
  skills: Array<{
    skill: SkillRecord | null;
  }>;
}

export interface TaskForUpdateRecord extends TaskRecord {
  subtasks: Array<{
    id: string;
    status: "TODO" | "IN_PROGRESS" | "DONE";
  }>;
}

export interface TaskChanges {
  title?: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  assigneeId?: string | null;
}

export interface TaskRepository {
  findSkillsByIds(skillIds: string[]): Promise<SkillRecord[]>;
  findAllSkills(): Promise<SkillRecord[]>;
  findDeveloperById(developerId: string): Promise<DeveloperRecord | null>;
  taskExists(taskId: string): Promise<boolean>;
  createTree(
    input: NewTaskRecord,
    parentId: string | null,
  ): Promise<CreatedTaskTreeRecord>;
  findAll(): Promise<TaskRecord[]>;
  findById(taskId: string): Promise<TaskForUpdateRecord | null>;
  update(
    taskId: string,
    changes: TaskChanges,
    reopenAncestors: boolean,
  ): Promise<void>;
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

  async findAllSkills() {
    return db.orm.public.Skill.select("id", "name")
      .orderBy((skill) => skill.name.asc())
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

  async createTree(input, parentId) {
    return db.transaction(async (transaction) => {
      async function createNode(
        node: NewTaskRecord,
        nodeParentId: string | null,
      ): Promise<CreatedTaskTreeRecord> {
        const task = await transaction.orm.public.Task.select(
          "id",
          "title",
          "status",
          "parentId",
        ).create({
          title: node.title,
          assigneeId: node.assigneeId,
          parentId: nodeParentId,
        });

        if (node.skillIds.length > 0) {
          await transaction.orm.public.TaskSkill.createAll(
            node.skillIds.map((skillId) => ({
              taskId: task.id,
              skillId,
            })),
          );
        }

        const subtasks: CreatedTaskTreeRecord[] = [];
        for (const subtask of node.subtasks) {
          subtasks.push(await createNode(subtask, task.id));
        }

        return { ...task, subtasks };
      }

      return createNode(input, parentId);
    });
  },

  async findAll() {
    return db.orm.public.Task.select("id", "title", "status", "parentId")
      .include("assignee", (assignee) => assignee.select("id", "name"))
      .include("skills", (taskSkills) =>
        taskSkills.include("skill", (skill) => skill.select("id", "name")),
      )
      .orderBy((task) => task.createdAt.asc())
      .all();
  },

  async findById(taskId) {
    return db.orm.public.Task.where({ id: taskId })
      .select("id", "title", "status", "parentId")
      .include("assignee", (assignee) => assignee.select("id", "name"))
      .include("skills", (taskSkills) =>
        taskSkills.include("skill", (skill) => skill.select("id", "name")),
      )
      .include("subtasks", (subtasks) => subtasks.select("id", "status"))
      .first();
  },

  async update(taskId, changes, reopenAncestors) {
    await db.transaction(async (transaction) => {
      await transaction.orm.public.Task.where({ id: taskId }).update(changes);

      if (!reopenAncestors) {
        return;
      }

      let parentId = (
        await transaction.orm.public.Task.where({ id: taskId })
          .select("parentId")
          .first()
      )?.parentId;

      while (parentId) {
        const parent = await transaction.orm.public.Task.where({ id: parentId })
          .select("id", "status", "parentId")
          .first();

        if (!parent) {
          throw new Error(
            `Task ${taskId} references missing parent ${parentId}`,
          );
        }

        if (parent.status === "DONE") {
          await transaction.orm.public.Task.where({ id: parent.id }).update({
            status: "IN_PROGRESS",
          });
        }

        parentId = parent.parentId;
      }
    });
  },
};
