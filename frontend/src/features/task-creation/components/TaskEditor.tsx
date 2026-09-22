import {
  ActionIcon,
  Button,
  Group,
  MultiSelect,
  Paper,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { IconCornerDownRight, IconPlus, IconTrash } from '@tabler/icons-react';

import type { Skill } from '../../../domain/task.js';

import {
  createEmptyTaskDraft,
  type TaskDraft,
} from '../../task-creation/model/taskDraft.js';

interface TaskEditorProps {
  task: TaskDraft;
  skills: Skill[];
  onChange: (task: TaskDraft) => void;
  showErrors: boolean;
  path?: string;
  onRemove?: () => void;
}

export function TaskEditor({
  task,
  skills,
  onChange,
  showErrors,
  path = '1',
  onRemove,
}: TaskEditorProps) {
  function addSubtask() {
    onChange({
      ...task,
      subtasks: [...task.subtasks, createEmptyTaskDraft()],
    });
  }

  function updateSubtask(updated: TaskDraft) {
    onChange({
      ...task,
      subtasks: task.subtasks.map((subtask) =>
        subtask.clientId === updated.clientId ? updated : subtask,
      ),
    });
  }

  function removeSubtask(clientId: string) {
    onChange({
      ...task,
      subtasks: task.subtasks.filter(
        (subtask) => subtask.clientId !== clientId,
      ),
    });
  }

  return (
    <Paper
      withBorder={Boolean(onRemove)}
      p={onRemove ? 'md' : 0}
      className={onRemove ? 'subtask-card' : undefined}
    >
      <Stack gap='md'>
        <Group justify='space-between'>
          <Group gap='xs'>
            {onRemove && (
              <IconCornerDownRight
                size={16}
                color='var(--mantine-color-dimmed)'
              />
            )}

            <Text size='sm' fw={600}>
              {onRemove ? `Subtask ${path}` : 'Task details'}
            </Text>
          </Group>

          {onRemove && (
            <Tooltip label='Remove this subtask'>
              <ActionIcon
                type='button'
                variant='subtle'
                color='gray'
                aria-label={`Remove subtask ${path}`}
                onClick={onRemove}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>

        <Textarea
          label='Task title'
          withAsterisk
          placeholder='Describe what needs to be done'
          value={task.title}
          autosize
          minRows={2}
          maxLength={500}
          error={
            showErrors && !task.title.trim() ? 'Enter a task title.' : undefined
          }
          onChange={(event) =>
            onChange({
              ...task,
              title: event.currentTarget.value,
            })
          }
        />

        <MultiSelect
          label='Required skills'
          description='Optional. Leave blank for no skill requirements.'
          placeholder='Select skills'
          data={skills.map((skill) => ({
            value: skill.id,
            label: skill.name,
          }))}
          value={task.skillIds}
          clearable
          onChange={(skillIds) =>
            onChange({
              ...task,
              skillIds,
            })
          }
        />

        {task.subtasks.map((subtask, index) => (
          <TaskEditor
            key={subtask.clientId}
            task={subtask}
            skills={skills}
            path={`${path}.${index + 1}`}
            showErrors={showErrors}
            onChange={updateSubtask}
            onRemove={() => removeSubtask(subtask.clientId)}
          />
        ))}

        <Button
          type='button'
          variant='subtle'
          leftSection={<IconPlus size={16} />}
          className='add-subtask-button'
          onClick={addSubtask}
        >
          {onRemove ? 'Add nested subtask' : 'Add subtask'}
        </Button>
      </Stack>
    </Paper>
  );
}
