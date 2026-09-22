import type {
  ApiDeveloper,
  ApiTask,
  ApiTaskStatus,
} from '../../../api/contracts';
import { getDevelopers } from '../../../api/developers';
import { getTasks, patchTask } from '../../../api/tasks';
import type { Developer, Task, TaskStatus, TaskUpdate } from '../../../domain/task';

const statusFromApi: Record<ApiTaskStatus, TaskStatus> = {
  TODO: 'To-do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

const statusToApi: Record<TaskStatus, ApiTaskStatus> = {
  'To-do': 'TODO',
  'In progress': 'IN_PROGRESS',
  Done: 'DONE',
};

function toTask(response: ApiTask): Task {
  return {
    id: response.id,
    title: response.title,
    requiredSkills: response.skills,
    assigneeId: response.assignee?.id ?? null,
    status: statusFromApi[response.status],
    subtasks: response.subtasks.map(toTask),
  };
}

function toDeveloper(response: ApiDeveloper): Developer {
  return {
    id: response.id,
    name: response.name,
    skills: response.skills.map(({ id, name }) => ({ id, name })),
  };
}

export interface TaskListData {
  tasks: Task[];
  developers: Developer[];
}

async function loadTasks(): Promise<Task[]> {
  return (await getTasks()).map(toTask);
}

export async function loadTaskList(): Promise<TaskListData> {
  const [tasks, developers] = await Promise.all([
    loadTasks(),
    getDevelopers(),
  ]);

  return {
    tasks,
    developers: developers.map(toDeveloper),
  };
}

export async function updateTask(
  taskId: string,
  update: TaskUpdate,
): Promise<Task[]> {
  await patchTask(taskId, {
    ...(update.assigneeId !== undefined
      ? { assigneeId: update.assigneeId }
      : {}),
    ...(update.status !== undefined
      ? { status: statusToApi[update.status] }
      : {}),
  });

  // Reload the hierarchy because reopening a task may also update its ancestors.
  return loadTasks();
}
