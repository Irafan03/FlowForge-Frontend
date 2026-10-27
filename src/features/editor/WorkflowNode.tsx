import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowFlowNode } from '../../types/workflow';
import { getNodeCatalogItem } from './nodeCatalog';

export function WorkflowNode({ data, selected }: NodeProps<WorkflowFlowNode>) {
  const item = getNodeCatalogItem(data.workflowType);
  const isTrigger = item.group === 'Trigger';
  const isIf = data.workflowType === 'if_condition';
  const configReady = item.requiredConfig.every((key) => {
    const value = data.config[key];
    return value !== undefined && value !== null && value !== '';
  });
  const runStateLabel: Record<string, string> = { pending: 'En attente', running: 'En cours…', success: 'Réussi', failed: 'Échec', skipped: 'Ignoré' };

  return (
    <article className={`workflow-node ${selected ? 'selected' : ''} ${item.color} ${data.runStatus ? `run-${data.runStatus}` : ''}`}>
      {!isTrigger && <Handle className="workflow-handle target-handle" type="target" position={Position.Left} />}
      <div className="workflow-node-topline">
        <span className={`workflow-node-icon ${item.color}`}>{item.icon}</span>
        <span className="workflow-node-category">{item.group}</span>
        {data.runStatus ? <span className={`workflow-node-state run-state run-${data.runStatus}`} title={data.runError ?? runStateLabel[data.runStatus]} /> : <span className={`workflow-node-state ${configReady ? 'ready' : 'needs-config'}`} title={configReady ? 'Configuration requise présente' : 'Configuration requise manquante'} />}
      </div>
      <strong className="workflow-node-label">{data.label || item.label}</strong>
      <span className="workflow-node-description">{item.description}</span>
      <div className="workflow-node-footer"><span className={`node-status-dot ${data.runStatus ? `run-${data.runStatus}` : ''}`} />{data.runStatus ? runStateLabel[data.runStatus] : configReady ? 'Prêt à configurer' : 'Configuration requise'}</div>
      {data.runStatus === 'failed' && data.runError && <small className="workflow-node-error" title={data.runError}>{data.runError}</small>}
      {isIf ? (
        <>
          <div className="if-handle-label true-label">true</div>
          <div className="if-handle-label false-label">false</div>
          <Handle className="workflow-handle if-handle true-handle" type="source" position={Position.Right} id="true" />
          <Handle className="workflow-handle if-handle false-handle" type="source" position={Position.Right} id="false" />
        </>
      ) : (
        <Handle className="workflow-handle source-handle" type="source" position={Position.Right} />
      )}
    </article>
  );
}
