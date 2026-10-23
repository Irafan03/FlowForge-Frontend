import { useCallback, type DragEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import type { WorkflowFlowEdge, WorkflowFlowNode, WorkflowNodeType } from '../../types/workflow';
import { WorkflowNode } from './WorkflowNode';

const nodeTypes: NodeTypes = { workflowNode: WorkflowNode };

type WorkflowCanvasProps = {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  onNodesChange: OnNodesChange<WorkflowFlowNode>;
  onEdgesChange: OnEdgesChange<WorkflowFlowEdge>;
  onConnect: (connection: Connection) => void;
  onSelectNode: (node: WorkflowFlowNode | null) => void;
  onDropNode: (type: WorkflowNodeType, position: { x: number; y: number }) => void;
  onInvalidConnection: () => void;
};

export function WorkflowCanvas({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onSelectNode, onDropNode, onInvalidConnection }: WorkflowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow<WorkflowFlowNode, WorkflowFlowEdge>();

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nodeType = event.dataTransfer.getData('application/flowforge-node') as WorkflowNodeType;
    if (!nodeType) return;
    onDropNode(nodeType, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }, [onDropNode, screenToFlowPosition]);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeClick: NodeMouseHandler<WorkflowFlowNode> = useCallback((_event, node) => onSelectNode(node), [onSelectNode]);
  const validateConnection = useCallback((connection: Connection | Edge) => {
    if (connection.source === connection.target) {
      onInvalidConnection();
      return false;
    }
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) adjacency.set(node.id, []);
    for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);
    if (connection.source && connection.target) adjacency.get(connection.source)?.push(connection.target);
    const pending = connection.target ? [connection.target] : [];
    const visited = new Set<string>();
    while (pending.length > 0) {
      const current = pending.pop();
      if (!current || visited.has(current)) continue;
      if (current === connection.source) {
        onInvalidConnection();
        return false;
      }
      visited.add(current);
      pending.push(...(adjacency.get(current) ?? []));
    }
    return true;
  }, [edges, nodes, onInvalidConnection]);

  return (
    <div className="workflow-canvas" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={validateConnection}
        onNodeClick={onNodeClick}
        onPaneClick={() => onSelectNode(null)}
        fitView
        fitViewOptions={{ padding: 0.24 }}
        minZoom={0.25}
        maxZoom={1.75}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep', animated: false, style: { stroke: '#9a88df', strokeWidth: 1.7 } }}
        className="flowforge-flow"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#d9d9e4" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => {
          const flowNode = node as WorkflowFlowNode;
          const colors: Record<string, string> = { violet: '#9278df', blue: '#61a4dd', red: '#e47c83', cyan: '#53abc4', amber: '#dda344', purple: '#9b79da', slate: '#9295a4' };
          return colors[flowNode.data ? String((flowNode.data as { workflowType?: string }).workflowType).split('_')[0] : ''] ?? '#9278df';
        }} />
        {nodes.length === 0 && <div className="canvas-empty-hint"><span>↙</span><strong>Commencez par un déclencheur</strong><small>Glissez un nœud Trigger depuis le panneau, ou cliquez sur celui-ci pour l’ajouter.</small></div>}
      </ReactFlow>
    </div>
  );
}

export function wouldCreateCycle(connection: Connection, nodes: WorkflowFlowNode[], edges: Edge[]): boolean {
  if (!connection.source || !connection.target) return false;
  if (connection.source === connection.target) return true;
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);
  adjacency.get(connection.source)?.push(connection.target);

  const pending = [connection.target];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    if (current === connection.source) return true;
    visited.add(current);
    pending.push(...(adjacency.get(current) ?? []));
  }
  return false;
}
