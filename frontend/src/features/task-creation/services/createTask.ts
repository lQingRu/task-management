import { getSkills } from '../../../api/skills';
import { postTask } from '../../../api/tasks';
import type { ApiTask } from '../../../api/contracts';
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

async function createTaskBranch(
  request: CreateTaskRequest,
  onCreated: () => void,
  parentId?: string,
): Promise<ApiTask> {
  const body = {
    title: request.title,
    skillIds: request.skillIds,
    ...(parentId ? { parentId } : {}),
  };

  const created = await postTask(body);
  onCreated();

  await Promise.all(
    request.subtasks.map((subtask) =>
      createTaskBranch(subtask, onCreated, created.id),
    ),
  );

  return created;
}

export async function createTask(
  request: CreateTaskRequest,
): Promise<CreatedTask> {
  let createdCount = 0;

  try {
    return await createTaskBranch(request, () => {
      createdCount += 1;
    });
  } catch (error) {
    if (createdCount === 0) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'The request failed.';

    throw new Error(
      `${message} ${createdCount} ${createdCount === 1 ? 'task was' : 'tasks were'} created before the failure; review the task list before retrying.`,
      { cause: error },
    );
  }
}
