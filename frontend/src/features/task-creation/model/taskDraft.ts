export const SKILLS = ['Frontend', 'Backend'] as const;

export type Skill = (typeof SKILLS)[number];

export interface TaskDraft {
  clientId: string;
  title: string;
  requiredSkills: Skill[];
  subtasks: TaskDraft[];
}

export interface CreateTaskRequest {
  title: string;
  requiredSkills: Skill[];
  subtasks: CreateTaskRequest[];
}

export function createEmptyTaskDraft(): TaskDraft {
  return {
    clientId: crypto.randomUUID(),
    title: '',
    requiredSkills: [],
    subtasks: [],
  };
}

export function validateTaskDraft(task: TaskDraft): boolean {
  return task.title.trim().length > 0 && task.subtasks.every(validateTaskDraft);
}

export function countTasks(task: TaskDraft): number {
  return (
    1 + task.subtasks.reduce((total, subtask) => total + countTasks(subtask), 0)
  );
}

export function toCreateTaskRequest(task: TaskDraft): CreateTaskRequest {
  return {
    title: task.title.trim(),
    requiredSkills: task.requiredSkills,
    subtasks: task.subtasks.map(toCreateTaskRequest),
  };
}
