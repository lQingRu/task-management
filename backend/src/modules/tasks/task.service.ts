import type {
  CreateTaskInput,
  CreatedTaskResponse,
  TaskResponse,
} from "./task.schema.js";
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

export async function getTasks(
  repository: TaskRepository = taskRepository,
): Promise<TaskResponse[]> {
  const records = await repository.findAll();
  const tasksById = new Map<string, TaskResponse>();

  for (const record of records) {
    const skills = record.skills.map(({ skill }) => {
      if (skill === null) {
        throw new Error(`Task ${record.id} has an invalid skill relation`);
      }

      return skill;
    });

    skills.sort((left, right) => left.name.localeCompare(right.name));

    tasksById.set(record.id, {
      id: record.id,
      title: record.title,
      status: record.status,
      skills,
      assignee: record.assignee,
      parentId: record.parentId,
      subtasks: [],
    });
  }

  const rootTasks: TaskResponse[] = [];

  for (const record of records) {
    const task = tasksById.get(record.id)!;

    if (record.parentId === null) {
      rootTasks.push(task);
      continue;
    }

    const parent = tasksById.get(record.parentId);
    if (!parent) {
      throw new Error(
        `Task ${record.id} references missing parent ${record.parentId}`,
      );
    }

    parent.subtasks.push(task);
  }

  return rootTasks;
}
