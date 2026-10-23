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

  return (
    <article className={`workflow-node ${selected ? 'selected' : ''} ${item.color}`}>
      {!isTrigger && <Handle className="workflow-handle target-handle" type="target" position={Position.Left} />}
      <div className="workflow-node-topline">
        <span className={`workflow-node-icon ${item.color}`}>{item.icon}</span>
        <span className="workflow-node-category">{item.group}</span>
        <span className={`workflow-node-state ${configReady ? 'ready' : 'needs-config'}`} title={configReady ? 'Configuration requise présente' : 'Configuration requise manquante'} />
      </div>
      <strong className="workflow-node-label">{data.label || item.label}</strong>
      <span className="workflow-node-description">{item.description}</span>
      <div className="workflow-node-footer"><span className="node-status-dot" />{configReady ? 'Prêt à configurer' : 'Configuration requise'}</div>
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
