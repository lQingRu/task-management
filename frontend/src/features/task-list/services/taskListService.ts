import {
  updateTaskTree,
  type Task,
  type TaskUpdate,
} from '../../../domain/task';
import { sampleTasks } from '../data/sampleTasks';

let taskStore: Task[] = structuredClone(sampleTasks);

function wait(milliseconds = 250) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function cloneTasks(tasks: Task[]): Task[] {
  return structuredClone(tasks);
}

export async function listTasks(): Promise<Task[]> {
  await wait();

  return cloneTasks(taskStore);
}

export async function updateTask(
  taskId: string,
  update: TaskUpdate,
): Promise<Task[]> {
  await wait();

  taskStore = updateTaskTree(taskStore, taskId, update);

  return cloneTasks(taskStore);
}
