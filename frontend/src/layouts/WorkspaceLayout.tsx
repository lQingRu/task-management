import type { ReactNode } from 'react';
import { AppShell, Button, Group, Text } from '@mantine/core';
import { IconLayoutList, IconPlus } from '@tabler/icons-react';

export type WorkspacePage = 'tasks' | 'create-task';

interface WorkspaceLayoutProps {
  activePage: WorkspacePage;
  onNavigate: (page: WorkspacePage) => void;
  children: ReactNode;
}

export function WorkspaceLayout({
  activePage,
  onNavigate,
  children,
}: WorkspaceLayoutProps) {
  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 208,
        breakpoint: 'sm',
        collapsed: {
          mobile: true,
        },
      }}
      padding={0}
    >
      <AppShell.Header>
        <Group h='100%' px='lg'>
          <div className='brand-mark'>
            <IconLayoutList size={20} />
          </div>

          <Text fw={600}>Task workspace</Text>

          <span className='header-divider' />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p='md'>
        <Text className='navigation-label'>WORKSPACE</Text>

        <Button
          variant={activePage === 'tasks' ? 'light' : 'subtle'}
          color={activePage === 'tasks' ? 'blue' : 'gray'}
          justify='flex-start'
          leftSection={<IconLayoutList size={18} />}
          onClick={() => onNavigate('tasks')}
        >
          Tasks
        </Button>

        <Button
          variant={activePage === 'create-task' ? 'light' : 'subtle'}
          color={activePage === 'create-task' ? 'blue' : 'gray'}
          justify='flex-start'
          leftSection={<IconPlus size={18} />}
          onClick={() => onNavigate('create-task')}
        >
          Create task
        </Button>

        <div className='navigation-footer'>
          <Text size='xs' c='dimmed' mt='xs'>
            Changes are saved to the task service.
          </Text>
        </div>
      </AppShell.Navbar>

      <AppShell.Main>
        <main className='page-content'>{children}</main>
      </AppShell.Main>
    </AppShell>
  );
}
