import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconListDetails,
  IconPlus,
  IconSearch,
} from '@tabler/icons-react';

import {
  canMarkTaskDone,
  flattenTasks,
  getEligibleDevelopers,
  TASK_STATUSES,
  type Task,
  type Developer,
  type TaskStatus,
  type TaskUpdate,
} from '../../../domain/task';
import { loadTaskList, updateTask } from '../services/taskListService';

interface TaskListPageProps {
  onCreateTask: () => void;
}

interface VisibleTask {
  task: Task;
  depth: number;
  contextOnly: boolean;
}

export function TaskListPage({ onCreateTask }: TaskListPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await loadTaskList();
        setTasks(data.tasks);
        setDevelopers(data.developers);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load tasks and developers.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const allTasks = useMemo(() => flattenTasks(tasks), [tasks]);

  const filtering = Boolean(search || statusFilter || assigneeFilter);

  const visibleTasks = useMemo(() => {
    const result: VisibleTask[] = [];
    const normalizedSearch = search.trim().toLowerCase();

    function taskMatches(task: Task): boolean {
      const matchesSearch =
        !normalizedSearch ||
        `${task.id} ${task.title}`.toLowerCase().includes(normalizedSearch);
      const matchesStatus = !statusFilter || task.status === statusFilter;
      const matchesAssignee =
        !assigneeFilter ||
        (assigneeFilter === 'unassigned'
          ? task.assigneeId === null
          : task.assigneeId === assigneeFilter);

      return matchesSearch && matchesStatus && matchesAssignee;
    }

    function branchMatches(task: Task): boolean {
      return taskMatches(task) || task.subtasks.some(branchMatches);
    }

    function visit(branch: Task[], depth = 0) {
      branch.forEach((task) => {
        if (filtering && !branchMatches(task)) {
          return;
        }

        result.push({
          task,
          depth,
          contextOnly: filtering && !taskMatches(task),
        });

        if (filtering || !collapsed.has(task.id)) {
          visit(task.subtasks, depth + 1);
        }
      });
    }

    visit(tasks);

    return result;
  }, [assigneeFilter, collapsed, filtering, search, statusFilter, tasks]);

  function toggleTask(taskId: string) {
    setCollapsed((current) => {
      const next = new Set(current);

      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }

      return next;
    });
  }

  async function handleUpdate(taskId: string, update: TaskUpdate) {
    try {
      setError(null);

      const updatedTasks = await updateTask(taskId, update);

      setTasks(updatedTasks);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to update the task.',
      );
    }
  }

  if (loading) {
    return (
      <Stack align='center' justify='center' mih={360}>
        <Loader />
        <Text size='sm' c='dimmed'>
          Loading tasks…
        </Text>
      </Stack>
    );
  }

  return (
    <>
      <Group
        justify='space-between'
        align='center'
        mb='xl'
        className='task-list-heading'
      >
        <div>
          <Text className='eyebrow'>TASK WORKSPACE</Text>

          <Title order={1}>Tasks</Title>

          <Text c='dimmed' mt='xs'>
            Keep work organised. Match the right skills to every task.
          </Text>
        </div>

        <Button leftSection={<IconPlus size={17} />} onClick={onCreateTask}>
          Create task
        </Button>
      </Group>

      {error && (
        <Alert
          color='red'
          mb='lg'
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <TaskSummary tasks={allTasks} />

      <Paper withBorder className='task-list-panel'>
        <Group p='md' justify='space-between' gap='sm' className='task-toolbar'>
          <TextInput
            aria-label='Search tasks'
            placeholder='Search tasks by title or ID'
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            w={280}
          />
          <Group gap='sm'>
            <Select
              aria-label='Filter by status'
              placeholder='All statuses'
              clearable
              data={[...TASK_STATUSES]}
              value={statusFilter}
              onChange={setStatusFilter}
              w={160}
            />

            <Select
              aria-label='Filter by assignee'
              placeholder='All assignees'
              clearable
              data={[
                {
                  value: 'unassigned',
                  label: 'Unassigned',
                },
                ...developers.map((developer) => ({
                  value: developer.id,
                  label: developer.name,
                })),
              ]}
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              w={160}
            />
          </Group>
        </Group>

        <Table.ScrollContainer minWidth={940}>
          <Table
            verticalSpacing='md'
            horizontalSpacing='lg'
            className='task-table'
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th w='44%'>Task</Table.Th>
                <Table.Th w='20%'>Required skills</Table.Th>
                <Table.Th w='20%'>Assignee</Table.Th>
                <Table.Th w='16%'>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {visibleTasks.map(({ task, depth, contextOnly }) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  developers={developers}
                  depth={depth}
                  contextOnly={contextOnly}
                  expanded={filtering || !collapsed.has(task.id)}
                  onToggle={() => toggleTask(task.id)}
                  onUpdate={(update) => handleUpdate(task.id, update)}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {visibleTasks.length === 0 && (
          <TaskListEmptyState
            hasTasks={allTasks.length > 0}
            onCreateTask={onCreateTask}
            onClearFilters={() => {
              setSearch('');
              setStatusFilter(null);
              setAssigneeFilter(null);
            }}
          />
        )}

        <Group p='md' justify='space-between' className='task-table-footer'>
          <Text size='xs' c='dimmed'>
            {tasks.length} top-level tasks · {allTasks.length} tasks including
            subtasks
          </Text>

          <Text size='xs' c='dimmed'>
            Changes save automatically
          </Text>
        </Group>
      </Paper>

      <Text size='sm' c='dimmed' mt='md'>
        Assignees must have every required skill. Complete subtasks before
        marking their parent Done.
      </Text>
    </>
  );
}

function TaskSummary({ tasks }: { tasks: Task[] }) {
  const summaries = [
    {
      label: 'All tasks',
      value: tasks.length,
      colour: 'gray',
    },
    {
      label: 'To-do',
      value: tasks.filter((task) => task.status === 'To-do').length,
      colour: 'gray',
    },
    {
      label: 'In progress',
      value: tasks.filter((task) => task.status === 'In progress').length,
      colour: 'blue',
    },
    {
      label: 'Done',
      value: tasks.filter((task) => task.status === 'Done').length,
      colour: 'green',
    },
  ];

  return (
    <Group className='task-summary' gap='xl'>
      {summaries.map((summary) => (
        <div key={summary.label} className='task-summary-item'>
          <Text size='sm' c='dimmed'>
            {summary.label}
          </Text>

          <Group gap='xs' mt={5}>
            <Text fz={26} fw={600}>
              {summary.value}
            </Text>

            <span className={`summary-dot summary-dot-${summary.colour}`} />
          </Group>
        </div>
      ))}
    </Group>
  );
}

function TaskRow({
  task,
  developers,
  depth,
  expanded,
  contextOnly,
  onToggle,
  onUpdate,
}: {
  task: Task;
  developers: Developer[];
  depth: number;
  expanded: boolean;
  contextOnly: boolean;
  onToggle: () => void;
  onUpdate: (update: TaskUpdate) => void;
}) {
  const eligibleDevelopers = getEligibleDevelopers(developers, task);

  const unfinishedDescendants = flattenTasks(task.subtasks).filter(
    (subtask) => subtask.status !== 'Done',
  ).length;

  const completedDirectSubtasks = task.subtasks.filter(
    (subtask) => subtask.status === 'Done',
  ).length;

  return (
    <Table.Tr className={depth > 0 ? 'nested-task-row' : ''}>
      <Table.Td>
        <Group
          wrap='nowrap'
          align='flex-start'
          gap='xs'
          style={{
            paddingLeft: Math.min(depth, 4) * 20,
          }}
        >
          {task.subtasks.length > 0 ? (
            <ActionIcon
              variant='subtle'
              color='gray'
              size='sm'
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${task.title}`}
              aria-expanded={expanded}
              onClick={onToggle}
            >
              {expanded ? (
                <IconChevronDown size={16} />
              ) : (
                <IconChevronRight size={16} />
              )}
            </ActionIcon>
          ) : (
            <span className='task-tree-leaf' />
          )}

          <div>
            <Text size='sm' fw={depth === 0 ? 600 : 400}>
              {task.title}
            </Text>

            <Group gap='xs' mt={5}>
              <Text size='xs' c='dimmed'>
                {task.id}
              </Text>

              {depth > 0 && (
                <Text size='xs' c='dimmed'>
                  Level {depth}
                </Text>
              )}

              {task.subtasks.length > 0 && (
                <Text size='xs' c='dimmed'>
                  {completedDirectSubtasks}/{task.subtasks.length} subtasks done
                </Text>
              )}

              {contextOnly && (
                <Badge size='xs' variant='light' color='gray'>
                  Parent context
                </Badge>
              )}
            </Group>
          </div>
        </Group>
      </Table.Td>

      <Table.Td>
        <Group gap={5}>
          {task.requiredSkills.map((skill) => (
            <Badge
              key={skill.id}
              variant='light'
              color={skill.name === 'Frontend' ? 'blue' : 'gray'}
              radius='sm'
              tt='none'
              fw={500}
            >
              {skill.name}
            </Badge>
          ))}
        </Group>
      </Table.Td>

      <Table.Td>
        <Select
          aria-label={`Assignee for ${task.title}`}
          placeholder='Unassigned'
          clearable
          searchable
          data={eligibleDevelopers.map((developer) => ({
            value: developer.id,
            label: developer.name,
          }))}
          value={task.assigneeId}
          nothingFoundMessage='No eligible developers'
          onChange={(assigneeId) => onUpdate({ assigneeId })}
        />

        <Text size='xs' c='dimmed' mt={4}>
          {eligibleDevelopers.length === 1
            ? `${eligibleDevelopers[0].name} has all required skills`
            : `${eligibleDevelopers.length} eligible developers`}
        </Text>
      </Table.Td>

      <Table.Td>
        <Tooltip
          label={
            unfinishedDescendants > 0
              ? `Complete ${unfinishedDescendants} unfinished subtasks first`
              : 'All subtasks are complete'
          }
          disabled={unfinishedDescendants === 0}
        >
          <div>
            <Select
              aria-label={`Status for ${task.title}`}
              className={`task-status task-status-${task.status
                .replace(' ', '-')
                .toLowerCase()}`}
              data={TASK_STATUSES.map((status) => ({
                value: status,
                label: status,
                disabled: status === 'Done' && !canMarkTaskDone(task),
              }))}
              value={task.status}
              allowDeselect={false}
              onChange={(status) => {
                if (status) {
                  onUpdate({
                    status: status as TaskStatus,
                  });
                }
              }}
            />
          </div>
        </Tooltip>

        {unfinishedDescendants > 0 && (
          <Text size='xs' c='dimmed' mt={4}>
            {unfinishedDescendants} unfinished{' '}
            {unfinishedDescendants === 1 ? 'subtask' : 'subtasks'}
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

function TaskListEmptyState({
  hasTasks,
  onCreateTask,
  onClearFilters,
}: {
  hasTasks: boolean;
  onCreateTask: () => void;
  onClearFilters: () => void;
}) {
  return (
    <Stack align='center' p={48} gap='sm'>
      <IconListDetails size={32} color='var(--mantine-color-gray-6)' />

      <Text fw={600}>
        {hasTasks ? 'No matching tasks' : 'Your workspace is ready'}
      </Text>

      <Text size='sm' c='dimmed'>
        {hasTasks
          ? 'Try another search or clear the filters.'
          : 'Create your first task to get started.'}
      </Text>

      <Button
        variant='light'
        onClick={hasTasks ? onClearFilters : onCreateTask}
      >
        {hasTasks ? 'Clear filters' : 'Create task'}
      </Button>
    </Stack>
  );
}
