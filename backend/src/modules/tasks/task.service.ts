import type {
  CreateTaskInput,
  CreatedTaskResponse,
  TaskResponse,
  UpdateTaskInput,
} from "./task.schema.js";
import { taskRepository, type TaskRepository } from "./task.repository.js";
import type { SkillInferenceService } from "./skill-inference/skill-inference.js";
import { skillInferenceService } from "./skill-inference/configured-skill-inference.service.js";

export type TaskCreationErrorCode =
  | "SKILLS_NOT_FOUND"
  | "ASSIGNEE_NOT_FOUND"
  | "ASSIGNEE_MISSING_SKILLS"
  | "PARENT_NOT_FOUND"
  | "SKILL_INFERENCE_FAILED"
  | "INFERRED_SKILLS_NOT_FOUND";

export class TaskCreationError extends Error {
  constructor(
    readonly code: TaskCreationErrorCode,
    message: string,
    readonly statusCode: 422 | 500 | 503 = 422,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TaskCreationError";
  }
}

export async function createTask(
  input: CreateTaskInput,
  repository: TaskRepository = taskRepository,
  inferenceService: SkillInferenceService = skillInferenceService,
): Promise<CreatedTaskResponse> {
  const [assignee, parentExists] = await Promise.all([
    input.assigneeId
      ? repository.findDeveloperById(input.assigneeId)
      : Promise.resolve(null),
    input.parentId
      ? repository.taskExists(input.parentId)
      : Promise.resolve(true),
  ]);

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

  const { skills, skillIds } = await resolveSkills(
    input,
    repository,
    inferenceService,
  );

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

async function resolveSkills(
  input: CreateTaskInput,
  repository: TaskRepository,
  inferenceService: SkillInferenceService,
) {
  const submittedSkillIds = [...new Set(input.skillIds ?? [])];

  if (submittedSkillIds.length > 0) {
    const skills = await repository.findSkillsByIds(submittedSkillIds);
    const foundSkillIds = new Set(skills.map((skill) => skill.id));
    const missingSkillIds = submittedSkillIds.filter(
      (skillId) => !foundSkillIds.has(skillId),
    );

    if (missingSkillIds.length > 0) {
      throw new TaskCreationError(
        "SKILLS_NOT_FOUND",
        `Skills not found: ${missingSkillIds.join(", ")}`,
      );
    }

    return { skills, skillIds: submittedSkillIds };
  }

  let inferredSkillNames: string[];
  try {
    inferredSkillNames = await inferenceService.inferSkills(input.title);
  } catch (error) {
    throw new TaskCreationError(
      "SKILL_INFERENCE_FAILED",
      "Required skills could not be identified. Please retry later or select skills explicitly.",
      503,
      { cause: error },
    );
  }

  const skills = await repository.findSkillsByNames(inferredSkillNames);
  const foundSkillNames = new Set(skills.map((skill) => skill.name));
  const missingSkillNames = inferredSkillNames.filter(
    (skillName) => !foundSkillNames.has(skillName),
  );

  if (missingSkillNames.length > 0) {
    throw new TaskCreationError(
      "INFERRED_SKILLS_NOT_FOUND",
      `Configured skills not found: ${missingSkillNames.join(", ")}`,
      500,
    );
  }

  return { skills, skillIds: skills.map((skill) => skill.id) };
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

export type TaskUpdateErrorCode =
  | "TASK_NOT_FOUND"
  | "ASSIGNEE_NOT_FOUND"
  | "ASSIGNEE_MISSING_SKILLS"
  | "SUBTASKS_NOT_DONE";

export class TaskUpdateError extends Error {
  constructor(
    readonly code: TaskUpdateErrorCode,
    readonly statusCode: 404 | 422,
    message: string,
  ) {
    super(message);
    this.name = "TaskUpdateError";
  }
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
  repository: TaskRepository = taskRepository,
): Promise<TaskResponse> {
  const currentTask = await repository.findById(taskId);

  if (!currentTask) {
    throw new TaskUpdateError(
      "TASK_NOT_FOUND",
      404,
      `Task not found: ${taskId}`,
    );
  }

  if (
    input.status === "DONE" &&
    currentTask.subtasks.some((subtask) => subtask.status !== "DONE")
  ) {
    throw new TaskUpdateError(
      "SUBTASKS_NOT_DONE",
      422,
      "A task cannot be completed while it has unfinished subtasks",
    );
  }

  if (input.assigneeId) {
    const assignee = await repository.findDeveloperById(input.assigneeId);

    if (!assignee) {
      throw new TaskUpdateError(
        "ASSIGNEE_NOT_FOUND",
        422,
        `Developer not found: ${input.assigneeId}`,
      );
    }

    const requiredSkillIds = currentTask.skills.map(({ skill }) => {
      if (!skill) {
        throw new Error(`Task ${taskId} has an invalid skill relation`);
      }

      return skill.id;
    });
    const assigneeSkillIds = new Set(
      assignee.skills.map(({ skillId }) => skillId),
    );

    if (requiredSkillIds.some((skillId) => !assigneeSkillIds.has(skillId))) {
      throw new TaskUpdateError(
        "ASSIGNEE_MISSING_SKILLS",
        422,
        "The selected developer does not possess all required skills",
      );
    }
  }

  const reopenAncestors =
    currentTask.status === "DONE" &&
    input.status !== undefined &&
    input.status !== "DONE";

  await repository.update(taskId, input, reopenAncestors);

  const updatedTask = findTask(await getTasks(repository), taskId);
  if (!updatedTask) {
    throw new Error(`Updated task ${taskId} could not be retrieved`);
  }

  return updatedTask;
}

function findTask(tasks: TaskResponse[], taskId: string): TaskResponse | null {
  for (const task of tasks) {
    if (task.id === taskId) {
      return task;
    }

    const nestedTask = findTask(task.subtasks, taskId);
    if (nestedTask) {
      return nestedTask;
    }
  }

  return null;
}
