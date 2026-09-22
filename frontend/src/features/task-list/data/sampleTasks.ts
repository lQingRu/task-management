import type { Skill, Task, TaskStatus } from '../../../domain/task';

function task(
  id: string,
  title: string,
  requiredSkills: Skill[],
  status: TaskStatus,
  assigneeId: string | null,
  subtasks: Task[] = [],
): Task {
  return {
    id,
    title,
    requiredSkills,
    skillSource: 'manual',
    assigneeId,
    status,
    subtasks,
  };
}

export const sampleTasks: Task[] = [
  task(
    'TSK-101',
    'Build a responsive homepage',
    ['Frontend'],
    'In progress',
    'alice',
    [
      task(
        'TSK-102',
        'Build the navigation header',
        ['Frontend'],
        'Done',
        'alice',
      ),
      task(
        'TSK-103',
        'Adapt the layout for mobile',
        ['Frontend'],
        'In progress',
        'carol',
        [
          task(
            'TSK-104',
            'Verify navigation on small screens',
            ['Frontend'],
            'To-do',
            null,
          ),
        ],
      ),
    ],
  ),
  task(
    'TSK-105',
    'Add audit logs for data access',
    ['Backend'],
    'To-do',
    'bob',
  ),
  task(
    'TSK-106',
    'Let users update their profile and photo',
    ['Frontend', 'Backend'],
    'To-do',
    null,
    [
      task('TSK-107', 'Build the profile form', ['Frontend'], 'To-do', null),
      task(
        'TSK-108',
        'Create the photo upload API',
        ['Backend'],
        'To-do',
        'dave',
      ),
    ],
  ),
  {
    ...task(
      'TSK-109',
      'Store account preferences',
      ['Backend'],
      'Done',
      'dave',
    ),
    skillSource: 'identified',
  },
];
