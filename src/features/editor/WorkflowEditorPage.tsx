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
import type { Credential, Workflow } from '../../types/api';
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

  async function runWorkflow() {
    if (!session || !workflow || !workflow.is_active || dirty) return;
    setExecuting(true);
    try {
      const queued = await executionService.trigger(session.accessToken, workflow.id, {});
      showToast(`Exécution mise en file (${queued.execution_id.slice(0, 8)}).`, 'success');
      navigate(`/history/${queued.execution_id}`);
    } catch (executionError) {
      showToast(executionError instanceof Error ? executionError.message : 'Impossible de démarrer l’exécution.', 'error');
    } finally {
      setExecuting(false);
    }
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
          <button className="button button-primary" type="button" disabled={executing || !configValid || !workflow?.is_active || dirty || validationErrors.length > 0} onClick={() => void runWorkflow()} title={!workflow ? 'Enregistrez le workflow avant de le tester' : !workflow.is_active ? 'Activez le workflow avant de le tester' : dirty ? 'Enregistrez les modifications avant de tester' : undefined}><span>▷</span> {executing ? 'Démarrage…' : 'Tester'}</button>
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
            onSelectNode={(node) => setSelectedNodeId(node?.id ?? null)}
            onDropNode={addNode}
            onInvalidConnection={() => setConnectionNotice('Cette connexion créerait un cycle et ne peut pas être ajoutée.')}
          />
          <details className="graph-inspector"><summary>Contrat JSON local <span>nodes / edges</span></summary><pre>{JSON.stringify(graph, null, 2)}</pre></details>
        </section>
        <NodeConfigPanel node={selectedNode} credentials={credentials} webhookUrl={webhookUrl} webhookUrlLoading={webhookUrlLoading} webhookUrlError={webhookUrlError} onCopyWebhookUrl={() => void copyWebhookUrl()} onUpdate={updateNode} onValidityChange={handleConfigValidity} onClose={() => { setSelectedNodeId(null); setConfigValid(true); }} onDelete={deleteNode} />
      </div>
      <div className="editor-statusbar"><span><i className="statusbar-dot" /> {workflow ? dirty ? 'Modifications non enregistrées' : 'Enregistré sur le serveur' : 'Brouillon non enregistré'}</span><span>Les validations côté serveur restent la référence</span></div>
    </div>
  );
}

export function WorkflowEditorPage() {
  return <ReactFlowProvider><WorkflowEditor /></ReactFlowProvider>;
}
