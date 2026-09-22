import { TaskCreationPage } from './features/task-creation/components/TaskCreationPage';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';

export function App() {
  return (
    <WorkspaceLayout>
      <TaskCreationPage />
    </WorkspaceLayout>
  );
}
