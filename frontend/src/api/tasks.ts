import { apiRequest } from './client';
import type { ApiTask, CreateTaskBody, UpdateTaskBody } from './contracts';

export function getTasks(): Promise<ApiTask[]> {
  return apiRequest<ApiTask[]>('/v1/tasks');
}

export function postTask(body: CreateTaskBody): Promise<ApiTask> {
  return apiRequest<ApiTask>('/v1/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function patchTask(
  taskId: string,
  body: UpdateTaskBody,
): Promise<ApiTask> {
  return apiRequest<ApiTask>(`/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
