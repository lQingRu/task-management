import { getSkills } from '../../../api/skills';
import { postTask } from '../../../api/tasks';
import type { Skill } from '../../../domain/task';
import type { CreateTaskRequest } from '../model/taskDraft';

export interface CreatedTask {
  id: string;
  title: string;
}

export async function listAvailableSkills(): Promise<Skill[]> {
  const skills = await getSkills();
  return skills.map(({ id, name }) => ({ id, name }));
}

export async function createTask(
  request: CreateTaskRequest,
): Promise<CreatedTask> {
  return postTask(request);
}
