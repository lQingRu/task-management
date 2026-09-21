import type { CreateTaskInput, CreatedTaskResponse } from "./task.schema.js";
import { taskRepository, type TaskRepository } from "./task.repository.js";

export type TaskCreationErrorCode =
  | "SKILLS_NOT_FOUND"
  | "ASSIGNEE_NOT_FOUND"
  | "ASSIGNEE_MISSING_SKILLS"
  | "PARENT_NOT_FOUND";

export class TaskCreationError extends Error {
  readonly statusCode = 422;

  constructor(
    readonly code: TaskCreationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TaskCreationError";
  }
}

export async function createTask(
  input: CreateTaskInput,
  repository: TaskRepository = taskRepository,
): Promise<CreatedTaskResponse> {
  const skillIds = [...new Set(input.skillIds ?? [])];

  const [skills, assignee, parentExists] = await Promise.all([
    repository.findSkillsByIds(skillIds),
    input.assigneeId
      ? repository.findDeveloperById(input.assigneeId)
      : Promise.resolve(null),
    input.parentId
      ? repository.taskExists(input.parentId)
      : Promise.resolve(true),
  ]);

  const foundSkillIds = new Set(skills.map((skill) => skill.id));
  const missingSkillIds = skillIds.filter(
    (skillId) => !foundSkillIds.has(skillId),
  );

  if (missingSkillIds.length > 0) {
    throw new TaskCreationError(
      "SKILLS_NOT_FOUND",
      `Skills not found: ${missingSkillIds.join(", ")}`,
    );
  }

  if (input.assigneeId && assignee === null) {
    throw new TaskCreationError(
      "ASSIGNEE_NOT_FOUND",
      `Developer not found: ${input.assigneeId}`,
    );
  }

  if (!parentExists) {
    throw new TaskCreationError(
      "PARENT_NOT_FOUND",
      `Parent task not found: ${input.parentId}`,
    );
  }

  if (assignee) {
    const developerSkillIds = new Set(
      assignee.skills.map(({ skillId }) => skillId),
    );
    const missingAssigneeSkills = skillIds.filter(
      (skillId) => !developerSkillIds.has(skillId),
    );

    if (missingAssigneeSkills.length > 0) {
      throw new TaskCreationError(
        "ASSIGNEE_MISSING_SKILLS",
        "The selected developer does not possess all required skills",
      );
    }
  }

  const task = await repository.create({
    title: input.title,
    skillIds,
    assigneeId: input.assigneeId ?? null,
    parentId: input.parentId ?? null,
  });

  return {
    id: task.id,
    title: task.title,
    status: task.status,
    skills,
    assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
    parentId: task.parentId,
    subtasks: [],
  };
}
