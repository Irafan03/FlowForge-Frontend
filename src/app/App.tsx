import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AuthPage } from '../features/auth/AuthPage';
import { WorkflowListPage } from '../features/workflows/WorkflowListPage';
import { WorkflowEditorPage } from '../features/editor/WorkflowEditorPage';
import { ExecutionHistoryPage } from '../features/executions/ExecutionHistoryPage';
import { CredentialsPage } from '../features/credentials/CredentialsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="workflows" element={<WorkflowListPage />} />
        <Route path="workflows/new" element={<WorkflowEditorPage />} />
        <Route path="workflows/:workflowId" element={<WorkflowEditorPage />} />
        <Route path="history" element={<ExecutionHistoryPage />} />
        <Route path="history/:executionId" element={<ExecutionHistoryPage />} />
        <Route path="credentials" element={<CredentialsPage />} />
      </Route>
      <Route path="login" element={<AuthPage mode="login" />} />
      <Route path="register" element={<AuthPage mode="register" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
