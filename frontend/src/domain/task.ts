export const TASK_STATUSES = ['To-do', 'In progress', 'Done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Skill {
  id: string;
  name: string;
}

export interface Developer {
  id: string;
  name: string;
  skills: Skill[];
}

export interface Task {
  id: string;
  title: string;
  requiredSkills: Skill[];
  assigneeId: string | null;
  status: TaskStatus;
  subtasks: Task[];
}

export type TaskUpdate = Partial<Pick<Task, 'assigneeId' | 'status'>>;

export function flattenTasks(tasks: Task[]): Task[] {
  return tasks.flatMap((task) => [task, ...flattenTasks(task.subtasks)]);
}

export function developerCanTakeTask(
  developer: Developer,
  task: Pick<Task, 'requiredSkills'>,
): boolean {
  const developerSkillIds = new Set(developer.skills.map((skill) => skill.id));

  return task.requiredSkills.every((skill) => developerSkillIds.has(skill.id));
}

export function getEligibleDevelopers(
  developers: Developer[],
  task: Pick<Task, 'requiredSkills'>,
): Developer[] {
  return developers.filter((developer) =>
    developerCanTakeTask(developer, task),
  );
}

export function canMarkTaskDone(task: Task): boolean {
  return task.subtasks.every(
    (subtask) => subtask.status === 'Done' && canMarkTaskDone(subtask),
  );
}
