import { describe, expect, it } from 'vitest';
import type { WorkflowGraph } from '../../types/workflow';
import { findInlineSecret, isValidScheduleCron, isValidScheduleTimezone, validateWorkflowGraph } from './graphValidation';

const node = (id: string, type: WorkflowGraph['nodes'][number]['type'], config: Record<string, unknown> = {}) => ({
  id,
  type,
  config,
  position: { x: 0, y: 0 },
});

describe('validateWorkflowGraph', () => {
  it('accepts a valid trigger and action graph', () => {
    const graph: WorkflowGraph = {
      nodes: [node('trigger', 'manual_trigger'), node('action', 'set_data', { fields: { status: 'ready' } })],
      edges: [{ source: 'trigger', target: 'action' }],
    };

    expect(validateWorkflowGraph(graph)).toEqual([]);
  });

  it('requires exactly one trigger and checks edge endpoints', () => {
    const graph: WorkflowGraph = {
      nodes: [node('action', 'set_data', { fields: {} })],
      edges: [{ source: 'missing', target: 'action' }],
    };

    const errors = validateWorkflowGraph(graph);
    expect(errors.some((error) => error.includes('exactement un'))).toBe(true);
    expect(errors.some((error) => error.includes('source inconnue'))).toBe(true);
  });

  it('rejects cycles and inline secrets', () => {
    const graph: WorkflowGraph = {
      nodes: [node('trigger', 'manual_trigger'), node('first', 'set_data', { fields: {}, api_key: 'unsafe' })],
      edges: [{ source: 'trigger', target: 'first' }, { source: 'first', target: 'trigger' }],
    };

    const errors = validateWorkflowGraph(graph);
    expect(errors.some((error) => error.includes('cycle'))).toBe(true);
    expect(errors.some((error) => error.includes('secret'))).toBe(true);
  });

  it('requires both IF branches to be connected', () => {
    const graph: WorkflowGraph = {
      nodes: [node('trigger', 'manual_trigger'), node('if', 'if_condition', { condition: { field: 'ok' } }), node('yes', 'set_data', { fields: {} })],
      edges: [
        { source: 'trigger', target: 'if' },
        { source: 'if', target: 'yes', source_handle: 'true' },
      ],
    };

    expect(validateWorkflowGraph(graph).some((error) => error.includes('true et false'))).toBe(true);
  });

  it('requires a valid Schedule cron and accepts UTC as the default timezone', () => {
    const valid: WorkflowGraph = { nodes: [node('schedule', 'schedule_trigger', { cron: '0 9 * * 1-5' })], edges: [] };
    expect(validateWorkflowGraph(valid)).toEqual([]);

    const invalid: WorkflowGraph = { nodes: [node('schedule', 'schedule_trigger', { cron: '60 9 * * *', timezone: 'Invalid/Zone' })], edges: [] };
    const errors = validateWorkflowGraph(invalid);
    expect(errors.some((error) => error.includes('cron'))).toBe(true);
    expect(errors.some((error) => error.includes('timezone'))).toBe(true);
  });

  it('requires an HTTP credential reference to include its supported type', () => {
    const base = { nodes: [node('trigger', 'manual_trigger'), node('request', 'http_request', { url: 'https://example.com', method: 'GET' })], edges: [{ source: 'trigger', target: 'request' }] } satisfies WorkflowGraph;
    expect(validateWorkflowGraph({ ...base, nodes: [base.nodes[0], node('request', 'http_request', { url: 'https://example.com', method: 'GET', credential_id: 'cred-1' })] }).some((error) => error.includes('credential'))).toBe(true);
    expect(validateWorkflowGraph({ ...base, nodes: [base.nodes[0], node('request', 'http_request', { url: 'https://example.com', method: 'GET', credential_type: 'api_key' })] }).some((error) => error.includes('credential_id'))).toBe(true);
    expect(validateWorkflowGraph({ ...base, nodes: [base.nodes[0], node('request', 'http_request', { url: 'https://example.com', method: 'GET', credential_id: 'cred-1', credential_type: 'http_header' })] })).toEqual([]);
  });
});

describe('Schedule configuration helpers', () => {
  it('checks five-field cron expressions and IANA timezones', () => {
    expect(isValidScheduleCron('0 9 * * 1-5')).toBe(true);
    expect(isValidScheduleCron('60 9 * * *')).toBe(false);
    expect(isValidScheduleCron('0 9 * *')).toBe(false);
    expect(isValidScheduleTimezone('UTC')).toBe(true);
    expect(isValidScheduleTimezone('Europe/Paris')).toBe(true);
    expect(isValidScheduleTimezone('Invalid/Zone')).toBe(false);
  });
});

describe('findInlineSecret', () => {
  it('finds sensitive keys recursively, including in arrays', () => {
    expect(findInlineSecret({ headers: [{ Authorization: 'Bearer token' }] })).toBe('config.headers[0].Authorization');
    expect(findInlineSecret({ credential_id: 'cred-1' })).toBeNull();
  });
});
