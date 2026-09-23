import type {
  CreateTaskInput,
  CreateTaskNodeInput,
  CreatedTaskResponse,
  TaskResponse,
  UpdateTaskInput,
} from "./task.schema.js";
import {
  taskRepository,
  type NewTaskRecord,
  type TaskRepository,
} from "./task.repository.js";
import type { SkillInferenceService } from "./skill-inference/skill-inference.js";
import { skillInferenceService } from "./skill-inference/configured-skill-inference.service.js";

export type TaskCreationErrorCode =
  | "SKILLS_NOT_FOUND"
  | "ASSIGNEE_NOT_FOUND"
  | "ASSIGNEE_MISSING_SKILLS"
  | "PARENT_NOT_FOUND"
  | "SKILL_INFERENCE_FAILED"
  | "INVALID_INFERRED_SKILLS"
  | "NO_SKILLS_CONFIGURED";

export class TaskCreationError extends Error {
  constructor(
    readonly code: TaskCreationErrorCode,
    message: string,
    readonly statusCode: 422 | 500 | 502 | 503 = 422,
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
  if (input.parentId && !(await repository.taskExists(input.parentId))) {
    throw new TaskCreationError(
      "PARENT_NOT_FOUND",
      `Parent task not found: ${input.parentId}`,
    );
  }

  let availableSkillsPromise: ReturnType<TaskRepository["findAllSkills"]> | null =
    null;
  const getAvailableSkills = () => {
    availableSkillsPromise ??= repository.findAllSkills();
    return availableSkillsPromise;
  };

  const prepared = await prepareTaskTree(
    input,
    repository,
    inferenceService,
    getAvailableSkills,
  );
  const created = await repository.createTree(
    toNewTaskRecord(prepared),
    input.parentId ?? null,
  );

  return toCreatedTaskResponse(prepared, created);
}

interface PreparedTask {
  title: string;
  skillIds: string[];
  skills: Array<{ id: string; name: string }>;
  assigneeId: string | null;
  assignee: { id: string; name: string } | null;
  subtasks: PreparedTask[];
}

async function prepareTaskTree(
  input: CreateTaskNodeInput,
  repository: TaskRepository,
  inferenceService: SkillInferenceService,
  getAvailableSkills: () => ReturnType<TaskRepository["findAllSkills"]>,
): Promise<PreparedTask> {
  const { skills, skillIds } = await resolveSkills(
    input,
    repository,
    inferenceService,
    getAvailableSkills,
  );
  const assignee = input.assigneeId
    ? await repository.findDeveloperById(input.assigneeId)
    : null;

  if (input.assigneeId && assignee === null) {
    throw new TaskCreationError(
      "ASSIGNEE_NOT_FOUND",
      `Developer not found: ${input.assigneeId}`,
    );
  }

  if (assignee) {
    const developerSkillIds = new Set(
      assignee.skills.map(({ skillId }) => skillId),
    );
    if (skillIds.some((skillId) => !developerSkillIds.has(skillId))) {
      throw new TaskCreationError(
        "ASSIGNEE_MISSING_SKILLS",
        "The selected developer does not possess all required skills",
      );
    }
  }

  const subtasks: PreparedTask[] = [];
  for (const subtask of input.subtasks ?? []) {
    subtasks.push(
      await prepareTaskTree(
        subtask,
        repository,
        inferenceService,
        getAvailableSkills,
      ),
    );
  }

  return {
    title: input.title,
    skillIds,
    skills,
    assigneeId: input.assigneeId ?? null,
    assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
    subtasks,
  };
}

async function resolveSkills(
  input: Pick<CreateTaskNodeInput, "skillIds" | "title">,
  repository: TaskRepository,
  inferenceService: SkillInferenceService,
  getAvailableSkills: () => ReturnType<TaskRepository["findAllSkills"]>,
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

  const availableSkills = await getAvailableSkills();
  if (availableSkills.length === 0) {
    throw new TaskCreationError(
      "NO_SKILLS_CONFIGURED",
      "No skills are configured for automatic identification",
      500,
    );
  }

  const availableSkillNames = availableSkills.map((skill) => skill.name);
  let inferredSkillNames: string[];
  try {
    inferredSkillNames = await inferenceService.inferSkills(
      input.title,
      availableSkillNames,
    );
  } catch (error) {
    throw new TaskCreationError(
      "SKILL_INFERENCE_FAILED",
      "Required skills could not be identified. Please retry later or select skills explicitly.",
      503,
      { cause: error },
    );
  }

  const skillsByName = new Map(
    availableSkills.map((skill) => [skill.name, skill] as const),
  );
  const skills = inferredSkillNames.map((skillName) =>
    skillsByName.get(skillName),
  );

  if (skills.some((skill) => skill === undefined)) {
    throw new TaskCreationError(
      "INVALID_INFERRED_SKILLS",
      "Skill inference returned a skill outside the configured catalog",
      502,
    );
  }

  const resolvedSkills = skills.filter((skill) => skill !== undefined);
  return {
    skills: resolvedSkills,
    skillIds: resolvedSkills.map((skill) => skill.id),
  };
}

function toNewTaskRecord(task: PreparedTask): NewTaskRecord {
  return {
    title: task.title,
    skillIds: task.skillIds,
    assigneeId: task.assigneeId,
    subtasks: task.subtasks.map(toNewTaskRecord),
  };
}

function toCreatedTaskResponse(
  prepared: PreparedTask,
  created: Awaited<ReturnType<TaskRepository["createTree"]>>,
): CreatedTaskResponse {
  if (prepared.subtasks.length !== created.subtasks.length) {
    throw new Error(`Created Task ${created.id} has an invalid subtree`);
  }

  return {
    id: created.id,
    title: created.title,
    status: created.status,
    skills: prepared.skills,
    assignee: prepared.assignee,
    parentId: created.parentId,
    subtasks: created.subtasks.map((subtask, index) =>
      toCreatedTaskResponse(prepared.subtasks[index]!, subtask),
    ),
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
