export const SKILLS = ['Frontend', 'Backend'] as const;

export const TASK_STATUSES = ['To-do', 'In progress', 'Done'] as const;

export type Skill = (typeof SKILLS)[number];

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Developer {
  id: string;
  name: string;
  skills: Skill[];
}

export interface Task {
  id: string;
  title: string;
  requiredSkills: Skill[];
  skillSource: 'manual' | 'identified';
  assigneeId: string | null;
  status: TaskStatus;
  subtasks: Task[];
}

export type TaskUpdate = Partial<Pick<Task, 'assigneeId' | 'status'>>;

export const DEVELOPERS: Developer[] = [
  {
    id: 'alice',
    name: 'Alice',
    skills: ['Frontend'],
  },
  {
    id: 'bob',
    name: 'Bob',
    skills: ['Backend'],
  },
  {
    id: 'carol',
    name: 'Carol',
    skills: ['Frontend', 'Backend'],
  },
  {
    id: 'dave',
    name: 'Dave',
    skills: ['Backend'],
  },
];

export function flattenTasks(tasks: Task[]): Task[] {
  return tasks.flatMap((task) => [task, ...flattenTasks(task.subtasks)]);
}

export function developerCanTakeTask(
  developer: Developer,
  task: Pick<Task, 'requiredSkills'>,
): boolean {
  return task.requiredSkills.every((skill) => developer.skills.includes(skill));
}

export function getEligibleDevelopers(
  task: Pick<Task, 'requiredSkills'>,
): Developer[] {
  return DEVELOPERS.filter((developer) =>
    developerCanTakeTask(developer, task),
  );
}

export function canMarkTaskDone(task: Task): boolean {
  return task.subtasks.every(
    (subtask) => subtask.status === 'Done' && canMarkTaskDone(subtask),
  );
}

export function updateTaskTree(
  tasks: Task[],
  taskId: string,
  update: TaskUpdate,
): Task[] {
  return tasks.map((task) => {
    if (task.id === taskId) {
      if (
        update.assigneeId &&
        !DEVELOPERS.some(
          (developer) =>
            developer.id === update.assigneeId &&
            developerCanTakeTask(developer, task),
        )
      ) {
        throw new Error(
          'The selected developer does not have all required skills.',
        );
      }

      if (update.status === 'Done' && !canMarkTaskDone(task)) {
        throw new Error('Complete all subtasks before marking this task Done.');
      }

      return {
        ...task,
        ...update,
      };
    }

    const updatedSubtasks = updateTaskTree(task.subtasks, taskId, update);

    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks,
    };

    // Preserve the invariant when a descendant
    // of a completed task is reopened.
    if (updatedTask.status === 'Done' && !canMarkTaskDone(updatedTask)) {
      updatedTask.status = 'In progress';
    }

    return updatedTask;
  });
}
