import type { ReactNode } from 'react';
import { AppShell, Button, Group, Text } from '@mantine/core';
import { IconLayoutList, IconPlus } from '@tabler/icons-react';

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
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

          <Text size='sm' c='dimmed'>
            Assessment
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p='md'>
        <Text className='navigation-label'>WORKSPACE</Text>

        <Button
          variant='subtle'
          color='gray'
          justify='flex-start'
          leftSection={<IconLayoutList size={18} />}
          disabled
        >
          Tasks
        </Button>

        <Button
          variant='light'
          justify='flex-start'
          leftSection={<IconPlus size={18} />}
        >
          Create task
        </Button>

        <Text size='xs' c='dimmed' mt='auto' p='sm'>
          Additional workspace pages can use this navigation later.
        </Text>
      </AppShell.Navbar>

      <AppShell.Main>
        <main className='page-content'>{children}</main>
      </AppShell.Main>
    </AppShell>
  );
}
