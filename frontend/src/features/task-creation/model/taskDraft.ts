export interface TaskDraft {
  clientId: string;
  title: string;
  skillIds: string[];
  subtasks: TaskDraft[];
}

export interface CreateTaskRequest {
  title: string;
  skillIds: string[];
  subtasks: CreateTaskRequest[];
}

export function createEmptyTaskDraft(): TaskDraft {
  return {
    clientId: crypto.randomUUID(),
    title: '',
    skillIds: [],
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
    skillIds: task.skillIds,
    subtasks: task.subtasks.map(toCreateTaskRequest),
  };
}
