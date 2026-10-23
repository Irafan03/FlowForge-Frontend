import { useState } from 'react';
import { NODE_CATALOG } from './nodeCatalog';
import type { WorkflowNodeType } from '../../types/workflow';

type NodePaletteProps = {
  onAddNode: (type: WorkflowNodeType) => void;
};

const groups = ['Trigger', 'Action', 'Logic'] as const;

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [query, setQuery] = useState('');
  const filteredNodes = NODE_CATALOG.filter((node) => `${node.label} ${node.description}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <aside className="editor-palette">
      <div className="palette-header"><div><h2>Nodes</h2><p>Glissez un nœud sur le canvas</p></div><span className="palette-count">{NODE_CATALOG.length}</span></div>
      <label className="palette-search"><span>⌕</span><input value={query} placeholder="Rechercher un nœud" aria-label="Rechercher un nœud" onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="palette-groups">
        {groups.map((group) => (
          <section className="palette-group" key={group}>
            <h3>{group}<span>{NODE_CATALOG.filter((node) => node.group === group).length}</span></h3>
            {filteredNodes.filter((node) => node.group === group).map((node) => (
              <button
                className="palette-node"
                key={node.type}
                type="button"
                draggable
                onClick={() => onAddNode(node.type)}
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/flowforge-node', node.type);
                  event.dataTransfer.effectAllowed = 'move';
                }}
              >
                <span className={`palette-node-icon ${node.color}`}>{node.icon}</span>
                <span className="palette-node-copy"><strong>{node.label}</strong><small>{node.description}</small></span>
                <span className="palette-add">＋</span>
              </button>
            ))}
          </section>
        ))}
      </div>
      <div className="palette-hint"><span>✦</span><p>Astuce : cliquez sur un nœud pour l’ajouter, ou glissez-le directement sur le canvas.</p></div>
    </aside>
  );
}
