import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkflowFlowNode } from '../../types/workflow';
import { NodeConfigPanel } from './NodeConfigPanel';

const scheduleNode: WorkflowFlowNode = {
  id: 'schedule-1',
  type: 'workflowNode',
  position: { x: 0, y: 0 },
  data: { workflowType: 'schedule_trigger', label: 'Schedule Trigger', config: { cron: '', timezone: 'UTC' } },
};

describe('NodeConfigPanel Schedule Trigger', () => {
  it('shows cron and UTC fields and reports configuration changes', () => {
    const onUpdate = vi.fn();
    const onValidityChange = vi.fn();

    render(
      <NodeConfigPanel node={scheduleNode} onUpdate={onUpdate} onClose={vi.fn()} onDelete={vi.fn()} credentials={[]} webhookUrl={null} webhookUrlLoading={false} webhookUrlError="" onCopyWebhookUrl={vi.fn()} onValidityChange={onValidityChange} />,
    );

    expect(screen.getByRole('textbox', { name: 'Fuseau horaire' })).toHaveValue('UTC');
    expect(screen.getByRole('textbox', { name: 'Expression cron' })).toHaveValue('');
    expect(screen.getByRole('alert')).toHaveTextContent('cron');

    fireEvent.change(screen.getByRole('textbox', { name: 'Expression cron' }), { target: { value: '0 9 * * 1-5' } });

    expect(onUpdate).toHaveBeenLastCalledWith('schedule-1', {
      label: 'Schedule Trigger',
      config: { cron: '0 9 * * 1-5', timezone: 'UTC' },
    });
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it('links an HTTP API Key credential by reference and stores only its header settings', () => {
    const onUpdate = vi.fn();
    const httpNode: WorkflowFlowNode = {
      id: 'http-1',
      type: 'workflowNode',
      position: { x: 0, y: 0 },
      data: { workflowType: 'http_request', label: 'HTTP Request', config: { url: 'https://example.com', method: 'GET' } },
    };
    const credentials = [
      { id: 'api-key-1', name: 'Example API', type: 'api_key', created_at: '', updated_at: '' },
      { id: 'telegram-1', name: 'Bot credential', type: 'telegram_bot', created_at: '', updated_at: '' },
    ];

    render(
      <NodeConfigPanel node={httpNode} onUpdate={onUpdate} onClose={vi.fn()} onDelete={vi.fn()} credentials={credentials} webhookUrl={null} webhookUrlLoading={false} webhookUrlError="" onCopyWebhookUrl={vi.fn()} onValidityChange={vi.fn()} />,
    );

    const selector = screen.getByRole('combobox', { name: 'Credential HTTP' });
    expect(selector).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Example API (API Key)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Bot credential (HTTP Header)' })).not.toBeInTheDocument();
    fireEvent.change(selector, { target: { value: 'api-key-1' } });

    expect(onUpdate).toHaveBeenLastCalledWith('http-1', {
      label: 'HTTP Request',
      config: {
        url: 'https://example.com',
        method: 'GET',
        credential_id: 'api-key-1',
        credential_type: 'api_key',
        api_key_header: 'Authorization',
        api_key_prefix: 'Bearer ',
      },
    });
  });

  it('shows a provisioned webhook URL and copies it on request', () => {
    const onCopyWebhookUrl = vi.fn();
    const webhookNode: WorkflowFlowNode = {
      id: 'webhook-1',
      type: 'workflowNode',
      position: { x: 0, y: 0 },
      data: { workflowType: 'webhook_trigger', label: 'Webhook Trigger', config: {} },
    };

    render(
      <NodeConfigPanel node={webhookNode} onUpdate={vi.fn()} onClose={vi.fn()} onDelete={vi.fn()} credentials={[]} webhookUrl="http://localhost/api/v1/webhooks/token" webhookUrlLoading={false} webhookUrlError="" onCopyWebhookUrl={onCopyWebhookUrl} onValidityChange={vi.fn()} />,
    );

    expect(screen.getByRole('textbox', { name: 'URL du webhook' })).toHaveValue('http://localhost/api/v1/webhooks/token');
    expect(screen.getByText(/Gardez-la privée/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copier' }));
    expect(onCopyWebhookUrl).toHaveBeenCalledOnce();
  });
});
