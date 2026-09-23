import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconCheck, IconInfoCircle } from '@tabler/icons-react';

import type { Skill } from '../../../domain/task';
import { createTask, listAvailableSkills } from '../services/createTask';
import {
  countTasks,
  createEmptyTaskDraft,
  toCreateTaskRequest,
  validateTaskDraft,
} from '../model/taskDraft';
import { TaskEditor } from './TaskEditor';

export function TaskCreationPage() {
  const [draft, setDraft] = useState(createEmptyTaskDraft);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        setSkills(await listAvailableSkills());
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load skills.',
        );
      } finally {
        setLoadingSkills(false);
      }
    }

    void load();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    setSuccessMessage(null);
    setError(null);

    if (!validateTaskDraft(draft)) {
      return;
    }

    setSubmitting(true);

    try {
      const request = toCreateTaskRequest(draft);

      const created = await createTask(request);

      setSuccessMessage(`"${created.title}" was created successfully.`);
      setDraft(createEmptyTaskDraft());
      setShowErrors(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Unable to create the task.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Group justify='space-between' align='flex-start' mb='xl'>
        <div>
          <Text className='eyebrow'>TASK WORKSPACE</Text>

          <Title order={1}>Create task</Title>

          <Text c='dimmed' mt='xs'>
            Define the work, then break it into manageable subtasks.
          </Text>
        </div>

        <Badge variant='light' color='gray' size='lg' tt='none'>
          New task
        </Badge>
      </Group>

      {successMessage && (
        <Alert
          color='green'
          mb='lg'
          withCloseButton
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

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

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing='xl'>
        <Paper
          component='form'
          withBorder
          p='xl'
          className='creation-form'
          onSubmit={handleSubmit}
        >
          <TaskEditor
            task={draft}
            skills={skills}
            onChange={setDraft}
            showErrors={showErrors}
          />

          {loadingSkills && (
            <Group gap='xs' mt='md'>
              <Loader size='xs' />
              <Text size='sm' c='dimmed'>
                Loading skills…
              </Text>
            </Group>
          )}

          {showErrors && !validateTaskDraft(draft) && (
            <Alert color='red' mt='lg'>
              Add a title to every task and subtask before creating.
            </Alert>
          )}

          <Group
            justify='space-between'
            mt='xl'
            pt='lg'
            className='form-footer'
          >
            <Text size='sm' c='dimmed'>
              {countTasks(draft)} {countTasks(draft) === 1 ? 'task' : 'tasks'}{' '}
              will be created
            </Text>

            <Button type='submit' loading={submitting} disabled={loadingSkills}>
              Create task
            </Button>
          </Group>
        </Paper>

        <Stack gap='lg'>
          <Paper withBorder p='lg'>
            <Text fw={600} mb='md'>
              How task creation works
            </Text>

            <Stack gap='lg'>
              <Hint
                title='Break work down'
                text='Add subtasks at any level. Every subtask has its own title and skills.'
              />

              <Hint
                title='Assign later'
                text='New tasks begin unassigned. Assignment belongs on the task list.'
              />

              <Hint
                title='Complete children first'
                text='A parent can be marked Done only after all its subtasks are Done.'
              />
            </Stack>
          </Paper>

          <Alert
            icon={<IconInfoCircle size={18} />}
            color='gray'
            title='Skills'
          >
            If no skills are selected, the task will be created with LLM
            suggested skills.
          </Alert>
        </Stack>
      </SimpleGrid>
    </>
  );
}

function Hint({ title, text }: { title: string; text: string }) {
  return (
    <Group align='flex-start' wrap='nowrap' gap='sm'>
      <IconCheck
        size={17}
        color='var(--mantine-color-blue-7)'
        className='hint-icon'
      />

      <div>
        <Text size='sm' fw={600}>
          {title}
        </Text>

        <Text size='sm' c='dimmed' mt={4}>
          {text}
        </Text>
      </div>
    </Group>
  );
}
