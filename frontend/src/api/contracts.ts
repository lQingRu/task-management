export interface ApiSkill {
  id: string;
  name: string;
}

export interface ApiDeveloper {
  id: string;
  name: string;
  skills: ApiSkill[];
}

export type ApiTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface ApiTask {
  id: string;
  title: string;
  status: ApiTaskStatus;
  skills: ApiSkill[];
  assignee: { id: string; name: string } | null;
  parentId: string | null;
  subtasks: ApiTask[];
}

export interface CreateTaskBody {
  title: string;
  skillIds: string[];
  parentId?: string;
  subtasks?: CreateTaskBody[];
}

export interface UpdateTaskBody {
  status?: ApiTaskStatus;
  assigneeId?: string | null;
}
