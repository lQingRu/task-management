import type { CreateTaskRequest } from '../model/taskDraft';

export interface CreatedTask {
  id: string;
  title: string;
}

export async function createTask(
  request: CreateTaskRequest,
): Promise<CreatedTask> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, 400);
  });

  console.log('Mock task request:', request);

  return {
    id: crypto.randomUUID(),
    title: request.title,
  };
}
