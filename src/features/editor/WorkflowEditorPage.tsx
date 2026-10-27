import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
} from '@xyflow/react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../../app/AuthContext';
import { useToast } from '../../app/ToastContext';
import { credentialService } from '../../services/credentialService';
import { executionService } from '../../services/executionService';
import { workflowService } from '../../services/workflowService';
import type { Credential, Execution, Workflow } from '../../types/api';
import { NodeConfigPanel } from './NodeConfigPanel';
import { NodePalette } from './NodePalette';
import { WorkflowCanvas, wouldCreateCycle } from './WorkflowCanvas';
import { getNodeCatalogItem } from './nodeCatalog';
import { validateWorkflowGraph } from './graphValidation';
import type { WorkflowFlowEdge, WorkflowFlowNode, WorkflowGraph, WorkflowNodeType } from '../../types/workflow';

function createFlowNode(type: WorkflowNodeType, position: { x: number; y: number }): WorkflowFlowNode {
  const catalogItem = getNodeCatalogItem(type);
  return {
    id: crypto.randomUUID(),
    type: 'workflowNode',
    position,
    data: {
      workflowType: type,
      label: catalogItem.label,
      config: type === 'schedule_trigger' ? { cron: '', timezone: 'UTC' } : {},
    },
  };
}

function serializeGraph(nodes: WorkflowFlowNode[], edges: WorkflowFlowEdge[]): WorkflowGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.workflowType,
      name: node.data.label,
      config: node.data.config,
      position: { x: node.position.x, y: node.position.y },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      source_handle: edge.sourceHandle ?? null,
      target_handle: edge.targetHandle ?? null,
    })),
  };
}

function WorkflowEditor() {
  const { workflowId } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowFlowEdge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Nouveau workflow');
  const [connectionNotice, setConnectionNotice] = useState('');
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [webhookUrlLoading, setWebhookUrlLoading] = useState(false);
  const [webhookUrlError, setWebhookUrlError] = useState('');
  const [loadingWorkflow, setLoadingWorkflow] = useState(Boolean(workflowId));
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [showTestData, setShowTestData] = useState(false);
  const [testTriggerType, setTestTriggerType] = useState<'gmail_trigger' | 'telegram_trigger' | null>(null);
  const [testEmail, setTestEmail] = useState({ from: 'demo@example.com', subject: 'Exemple de message', body_text: 'Bonjour, ceci est un e-mail de test.' });
  const [testTelegramMessage, setTestTelegramMessage] = useState({ chat_id: '', text: 'Bonjour, peux-tu m’aider ?', username: 'demo_user' });
  const [selectedRunNodeId, setSelectedRunNodeId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [configValid, setConfigValid] = useState(true);
  const { session } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { screenToFlowPosition } = useReactFlow<WorkflowFlowNode, WorkflowFlowEdge>();
  const handleConfigValidity = useCallback((valid: boolean) => setConfigValid(valid), []);

  const graph = useMemo(() => serializeGraph(nodes, edges), [nodes, edges]);
  const validationErrors = useMemo(() => validateWorkflowGraph(graph), [graph]);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  useEffect(() => {
    if (!workflowId || !session) {
      setLoadingWorkflow(false);
      return;
    }
    let cancelled = false;
    setLoadingWorkflow(true);
    setLoadError('');
    workflowService.get(session.accessToken, workflowId).then((loaded) => {
      if (cancelled) return;
      setWorkflow(loaded);
      setWorkflowName(loaded.name);
      setNodes(loaded.graph.nodes.map((node) => ({
        id: node.id,
        type: 'workflowNode',
        position: node.position,
        data: {
          workflowType: node.type,
          label: node.name ?? getNodeCatalogItem(node.type).label,
          config: node.type === 'schedule_trigger'
            ? { ...node.config, timezone: node.config.timezone ?? 'UTC' }
            : node.config,
        },
      })));
      setEdges(loaded.graph.edges.map((edge, index) => ({
        id: edge.id ?? `edge-${index}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.source_handle ?? undefined,
        targetHandle: edge.target_handle ?? undefined,
        type: 'smoothstep',
      })));
      setDirty(false);
    }).catch((loadFailure: unknown) => {
      if (!cancelled) setLoadError(loadFailure instanceof Error ? loadFailure.message : 'Impossible de charger ce workflow.');
    }).finally(() => {
      if (!cancelled) setLoadingWorkflow(false);
    });
    return () => { cancelled = true; };
  }, [session, setEdges, setNodes, workflowId]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    credentialService.list(session.accessToken).then((items) => {
      if (!cancelled) setCredentials(items);
    }).catch(() => {
      if (!cancelled) setCredentials([]);
    });
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!session || !workflow || selectedNode?.data.workflowType !== 'webhook_trigger') {
      setWebhookUrl(null);
      setWebhookUrlLoading(false);
      setWebhookUrlError('');
      return;
    }
    let cancelled = false;
    setWebhookUrl(null);
    setWebhookUrlLoading(true);
    setWebhookUrlError('');
    workflowService.getWebhookUrl(session.accessToken, workflow.id).then((url) => {
      if (!cancelled) setWebhookUrl(url);
    }).catch((failure: unknown) => {
      if (!cancelled) setWebhookUrlError(failure instanceof Error ? failure.message : 'Impossible de charger l’URL du webhook.');
    }).finally(() => {
      if (!cancelled) setWebhookUrlLoading(false);
    });
    return () => { cancelled = true; };
  }, [session, selectedNode?.id, selectedNode?.data.workflowType, workflow]);

  const copyWebhookUrl = useCallback(async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      showToast('URL du webhook copiée.', 'success');
    } catch {
      showToast('Impossible de copier l’URL du webhook.', 'error');
    }
  }, [showToast, webhookUrl]);

  const addNode = useCallback((type: WorkflowNodeType, position?: { x: number; y: number }) => {
    let nodePosition = position;
    if (!nodePosition) {
      const canvas = document.querySelector('.workflow-canvas')?.getBoundingClientRect();
      const centerX = canvas ? canvas.left + canvas.width * 0.5 : window.innerWidth * 0.57;
      const centerY = canvas ? canvas.top + canvas.height * 0.32 : window.innerHeight * 0.4;
      const columns = (canvas?.width ?? window.innerWidth) >= 740 ? 2 : 1;
      const horizontalSpread = columns === 2 ? Math.min(200, Math.max(170, ((canvas?.width ?? 740) - 350) / 2)) : 0;
      const column = nodes.length % columns;
      const row = Math.floor(nodes.length / columns);
      nodePosition = screenToFlowPosition({
        x: centerX + (column === 0 ? -horizontalSpread : horizontalSpread),
        y: centerY + row * 230,
      });
    }
    const newNode = createFlowNode(type, nodePosition);
    setNodes((current) => [...current, newNode]);
    setSelectedNodeId(newNode.id);
    setDirty(true);
    setConnectionNotice('');
  }, [nodes.length, screenToFlowPosition, setNodes]);

  const handleConnect = useCallback((connection: Connection) => {
    if (wouldCreateCycle(connection, nodes, edges)) {
      setConnectionNotice('Cette connexion créerait un cycle, refusé par le backend.');
      return;
    }
    setEdges((current) => addEdge({ ...connection, id: crypto.randomUUID(), type: 'smoothstep' }, current));
    setDirty(true);
    setConnectionNotice('');
  }, [edges, nodes, setEdges]);

  const updateNode = useCallback((nodeId: string, update: { label: string; config: Record<string, unknown> }) => {
    setNodes((current) => current.map((node) => node.id === nodeId
      ? { ...node, data: { ...node.data, label: update.label, config: update.config } }
      : node));
    setDirty(true);
  }, [setNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNodeId(null);
    setDirty(true);
  }, [setEdges, setNodes]);

  async function saveWorkflow() {
    if (!session || validationErrors.length > 0 || !workflowName.trim()) return;
    setSaving(true);
    try {
      const input = { name: workflowName.trim(), graph };
      const saved = workflowId
        ? await workflowService.update(session.accessToken, workflowId, input)
        : await workflowService.create(session.accessToken, input);
      setWorkflow(saved);
      setWorkflowName(saved.name);
      setDirty(false);
      showToast('Workflow enregistré.', 'success');
      if (!workflowId) navigate(`/workflows/${saved.id}`, { replace: true });
    } catch (saveError) {
      showToast(saveError instanceof Error ? saveError.message : 'Impossible d’enregistrer le workflow.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivation() {
    if (!session || !workflow || dirty) return;
    setActivating(true);
    try {
      const result = workflow.is_active
        ? await workflowService.deactivate(session.accessToken, workflow.id)
        : await workflowService.activate(session.accessToken, workflow.id);
      setWorkflow((current) => current ? { ...current, is_active: result.is_active } : current);
      showToast(`Workflow ${result.is_active ? 'activé' : 'désactivé'}.`, 'success');
    } catch (activationError) {
      showToast(activationError instanceof Error ? activationError.message : 'Impossible de modifier le statut du workflow.', 'error');
    } finally {
      setActivating(false);
    }
  }

  function applyExecution(execution: Execution) {
    const byNode = new Map(execution.node_executions.map((item) => [item.node_id, item]));
    setNodes((current) => current.map((node) => {
      const result = byNode.get(node.id);
      return { ...node, data: { ...node.data, runStatus: result?.status ?? (['queued', 'running'].includes(execution.status) ? 'pending' : undefined), runError: result?.error ?? null, runOutput: result?.output ?? null } };
    }));
    const failedNode = execution.node_executions.find((item) => item.status === 'failed');
    const lastNode = execution.node_executions[execution.node_executions.length - 1];
    setSelectedRunNodeId(failedNode?.node_id ?? lastNode?.node_id ?? null);
  }

  async function runWorkflow(inputData: Record<string, unknown> = {}) {
    if (!session || !workflow || !workflow.is_active || dirty) return;
    setExecuting(true);
    setShowTestData(false);
    setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, runStatus: 'pending', runError: null, runOutput: null } })));
    try {
      const queued = await executionService.trigger(session.accessToken, workflow.id, inputData);
      let latest: Execution | null = null;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        latest = await executionService.get(session.accessToken, queued.execution_id);
        applyExecution(latest);
        if (!['queued', 'running'].includes(latest.status)) break;
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      if (latest?.status === 'success') showToast('Workflow ex?cut? avec succ?s.', 'success');
      else if (latest?.status === 'failed') showToast(latest.error ?? 'Le workflow a ?chou?. Cliquez sur le n?ud en erreur pour voir le d?tail.', 'error');
      else showToast(`Ex?cution ${queued.execution_id.slice(0, 8)} toujours en cours.`, 'info');
    } catch (executionError) {
      showToast(executionError instanceof Error ? executionError.message : 'Impossible de d?marrer l?ex?cution.', 'error');
    } finally {
      setExecuting(false);
    }
  }

  function requestRun() {
    if (nodes.some((node) => node.data.workflowType === 'gmail_trigger')) {
      setTestTriggerType('gmail_trigger');
      setShowTestData(true);
      return;
    }
    const telegramTrigger = nodes.find((node) => node.data.workflowType === 'telegram_trigger');
    if (telegramTrigger) {
      const allowedChatIds = telegramTrigger.data.config.allowed_chat_ids;
      const chatId = Array.isArray(allowedChatIds) ? String(allowedChatIds[0] ?? '') : '';
      setTestTelegramMessage((current) => ({ ...current, chat_id: chatId || current.chat_id }));
      setTestTriggerType('telegram_trigger');
      setShowTestData(true);
      return;
    }
    void runWorkflow();
  }

  return (
    <div className="workflow-editor-page">
      <div className="editor-toolbar">
        <div className="editor-title-block">
          <Link to="/workflows" className="back-link" aria-label="Retour aux workflows">←</Link>
          <span className="editor-title-divider" />
          <label className="editor-name-label"><span className="sr-only">Nom du workflow</span><input value={workflowName} onChange={(event) => { setWorkflowName(event.target.value); setDirty(true); }} aria-label="Nom du workflow" maxLength={255} /></label>
          <span className={`editor-local-badge ${workflow ? 'saved' : ''}`}><i /> {workflow ? dirty ? 'Modifications non enregistrées' : workflow.is_active ? 'Actif' : 'Enregistré' : 'Nouveau brouillon'}</span>
          {workflowId && <span className="editor-id-hint">ID {workflowId.slice(0, 8)}</span>}
        </div>
        <div className="editor-toolbar-actions">
          {workflow && <button className="button button-secondary" type="button" disabled={activating || dirty || loadingWorkflow} onClick={() => void toggleActivation()}>{activating ? '…' : workflow.is_active ? 'Désactiver' : 'Activer'}</button>}
          <button className="button button-secondary editor-save-button" type="button" disabled={saving || loadingWorkflow || !configValid || validationErrors.length > 0 || !workflowName.trim()} onClick={() => void saveWorkflow()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          <button className="button button-primary" type="button" disabled={executing || !configValid || !workflow?.is_active || dirty || validationErrors.length > 0} onClick={requestRun} title={!workflow ? 'Enregistrez le workflow avant de le tester' : !workflow.is_active ? 'Activez le workflow avant de le tester' : dirty ? 'Enregistrez les modifications avant de tester' : undefined}><span>▷</span> {executing ? 'Exécution…' : 'Tester'}</button>
        </div>
      </div>

      <div className="editor-workspace">
        <NodePalette onAddNode={(type) => addNode(type)} />
        <section className="editor-center-column" aria-label="Canvas du workflow">
          <div className="canvas-topbar">
            <div className="canvas-breadcrumb"><span>Canvas</span><span>·</span><strong>{nodes.length} nœud{nodes.length > 1 ? 's' : ''}</strong><span>{edges.length} connexion{edges.length > 1 ? 's' : ''}</span></div>
            <div className={`graph-validation-pill ${validationErrors.length === 0 ? 'valid' : 'invalid'}`}><i />{validationErrors.length === 0 ? 'Graphe valide' : `${validationErrors.length} point${validationErrors.length > 1 ? 's' : ''} à corriger`}</div>
          </div>
          {loadError && <div className="editor-validation-message" role="alert">{loadError} <button onClick={() => navigate('/workflows')}>Retour aux workflows</button></div>}
          {loadingWorkflow && <div className="editor-loading-overlay"><span className="loading-spinner" /> Chargement du workflow…</div>}
          {(connectionNotice || validationErrors.length > 0) && <div className={`editor-validation-message ${connectionNotice ? 'notice' : ''}`} role="status">
            <span>{connectionNotice || validationErrors[0]}</span>
            {validationErrors.length > 1 && <details><summary>Voir les {validationErrors.length} vérifications</summary><ul>{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul></details>}
          </div>}
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => { if (changes.some((change) => ['position', 'add', 'remove', 'replace'].includes(change.type))) setDirty(true); onNodesChange(changes); }}
            onEdgesChange={(changes) => { if (changes.some((change) => ['add', 'remove', 'replace'].includes(change.type))) setDirty(true); onEdgesChange(changes); }}
            onConnect={handleConnect}
            onSelectNode={(node) => { setSelectedNodeId(node?.id ?? null); if (node?.data.runStatus) setSelectedRunNodeId(node.id); }}
            onDropNode={addNode}
            onInvalidConnection={() => setConnectionNotice('Cette connexion créerait un cycle et ne peut pas être ajoutée.')}
          />
          {selectedRunNodeId && nodes.find((node) => node.id === selectedRunNodeId)?.data.runStatus && <section className="execution-inspector"><header><strong>Données d’exécution</strong><button type="button" onClick={() => setSelectedRunNodeId(null)} aria-label="Fermer les données">×</button></header>{(() => { const node = nodes.find((item) => item.id === selectedRunNodeId); return node ? <><p>{node.data.label} · {node.data.runStatus}</p>{node.data.runError && <div className="execution-inspector-error">{node.data.runError}</div>}<pre>{JSON.stringify(node.data.runOutput, null, 2) ?? 'Aucune sortie'}</pre></> : null; })()}</section>}
          <details className="graph-inspector"><summary>Contrat JSON local <span>nodes / edges</span></summary><pre>{JSON.stringify(graph, null, 2)}</pre></details>
        </section>
        <NodeConfigPanel node={selectedNode} availableNodes={selectedNode ? nodes.filter((candidate) => edges.some((edge) => edge.source === candidate.id && edge.target === selectedNode.id)) : []} credentials={credentials} webhookUrl={webhookUrl} webhookUrlLoading={webhookUrlLoading} webhookUrlError={webhookUrlError} onCopyWebhookUrl={() => void copyWebhookUrl()} onUpdate={updateNode} onValidityChange={handleConfigValidity} onClose={() => { setSelectedNodeId(null); setConfigValid(true); }} onDelete={deleteNode} />
      </div>
      {showTestData && <div className="test-data-backdrop" role="presentation"><section className="test-data-dialog" role="dialog" aria-modal="true" aria-labelledby="test-data-title">
        <h2 id="test-data-title">{testTriggerType === 'gmail_trigger' ? 'Tester avec un e-mail exemple' : 'Tester avec un message Telegram exemple'}</h2>
        <p>Ces donn?es servent uniquement ? cette ex?cution manuelle.</p>
        {testTriggerType === 'gmail_trigger' ? <>
          <label className="config-field"><span>Exp?diteur</span><input value={testEmail.from} onChange={(event) => setTestEmail((current) => ({ ...current, from: event.target.value }))} /></label>
          <label className="config-field"><span>Objet</span><input value={testEmail.subject} onChange={(event) => setTestEmail((current) => ({ ...current, subject: event.target.value }))} /></label>
          <label className="config-field"><span>Corps du message</span><textarea value={testEmail.body_text} onChange={(event) => setTestEmail((current) => ({ ...current, body_text: event.target.value }))} /></label>
          <div className="test-data-actions"><button className="button button-secondary" type="button" onClick={() => setShowTestData(false)}>Annuler</button><button className="button button-primary" type="button" disabled={executing} onClick={() => void runWorkflow({ ...testEmail, received_at: new Date().toISOString() })}>{executing ? 'Ex?cution?' : 'Lancer le test'}</button></div>
        </> : <>
          <label className="config-field"><span>Chat ID</span><input value={testTelegramMessage.chat_id} onChange={(event) => setTestTelegramMessage((current) => ({ ...current, chat_id: event.target.value }))} /></label>
          <label className="config-field"><span>Message entrant</span><textarea value={testTelegramMessage.text} onChange={(event) => setTestTelegramMessage((current) => ({ ...current, text: event.target.value }))} /></label>
          <div className="test-data-actions"><button className="button button-secondary" type="button" onClick={() => setShowTestData(false)}>Annuler</button><button className="button button-primary" type="button" disabled={executing} onClick={() => void runWorkflow({ chat_id: testTelegramMessage.chat_id, text: testTelegramMessage.text, from_user: { id: testTelegramMessage.chat_id, username: testTelegramMessage.username }, received_at: new Date().toISOString() })}>{executing ? 'Ex?cution?' : 'Lancer le test'}</button></div>
        </>}
      </section></div>}
      <div className="editor-statusbar"><span><i className="statusbar-dot" /> {workflow ? dirty ? 'Modifications non enregistrées' : 'Enregistré sur le serveur' : 'Brouillon non enregistré'}</span><span>Les validations côté serveur restent la référence</span></div>
    </div>
  );
}

export function WorkflowEditorPage() {
  return <ReactFlowProvider><WorkflowEditor /></ReactFlowProvider>;
}
