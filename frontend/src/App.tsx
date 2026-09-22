import { useState } from 'react';

import { WorkspaceLayout, type WorkspacePage } from './layouts/WorkspaceLayout';
import { TaskCreationPage } from './features/task-creation/components/TaskCreationPage';
import { TaskListPage } from './features/task-list/components/TaskListPage';

export function App() {
  const [page, setPage] = useState<WorkspacePage>('tasks');

  return (
    <WorkspaceLayout activePage={page} onNavigate={setPage}>
      {page === 'tasks' ? (
        <TaskListPage onCreateTask={() => setPage('create-task')} />
      ) : (
        <TaskCreationPage />
      )}
    </WorkspaceLayout>
  );
}
