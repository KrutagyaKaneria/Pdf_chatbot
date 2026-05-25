import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom Node Component to match the Stitch Design
const CustomNode = ({ data }: { data: any }) => {
  return (
    <div className={`glass-panel p-6 rounded-2xl relative group transition-colors w-48 ${data.isLast ? 'border-primary/50 border' : ''} hover:bg-surface-container`}>
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none" />
      <span className="material-symbols-outlined text-primary mb-4">{data.icon}</span>
      <h3 className="text-sm font-bold mb-1 text-on-surface">{data.title}</h3>
      <p className="text-xs text-on-surface-variant">{data.desc}</p>
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-none" />
    </div>
  );
};

const initialNodes: Node[] = [
  { id: '1', type: 'custom', position: { x: 0, y: 150 }, data: { icon: 'upload_file', title: 'PDF Upload', desc: 'Multi-modal parsing engine.' } },
  { id: '2', type: 'custom', position: { x: 250, y: 150 }, data: { icon: 'data_object', title: 'Parsing', desc: 'Layout aware extraction.' } },
  { id: '3', type: 'custom', position: { x: 500, y: 150 }, data: { icon: 'splitscreen', title: 'Chunking', desc: 'Semantic context grouping.' } },
  { id: '4', type: 'custom', position: { x: 750, y: 150 }, data: { icon: 'dynamic_form', title: 'Embeddings', desc: 'High-dimensional vectors.' } },
  { id: '5', type: 'custom', position: { x: 1000, y: 150 }, data: { icon: 'database', title: 'Vector DB', desc: 'Cloud-native persistence.' } },
  { id: '6', type: 'custom', position: { x: 1250, y: 150 }, data: { icon: 'search_insights', title: 'Hybrid', desc: 'Semantic + Keyword.' } },
  { id: '7', type: 'custom', position: { x: 1500, y: 150 }, data: { icon: 'filter_list', title: 'Reranking', desc: 'Contextual relevance score.' } },
  { id: '8', type: 'custom', position: { x: 1750, y: 150 }, data: { icon: 'auto_awesome', title: 'AI Gen', desc: 'Source-cited responses.', isLast: true } },
];

const initialEdges: Edge[] = [];
for (let i = 1; i < 8; i++) {
  initialEdges.push({
    id: `e${i}-${i+1}`,
    source: `${i}`,
    target: `${i+1}`,
    animated: true,
    style: { stroke: '#acc7ff', strokeWidth: 2, opacity: 0.5 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#508ff8',
    },
  });
}

const WorkflowSection = () => {
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  return (
    <section className="py-24 px-6 max-w-[1400px] mx-auto reveal">
      <div className="mb-16">
        <h2 className="text-4xl font-headline text-on-surface mb-4">The Intelligent Lifecycle</h2>
        <p className="text-on-surface-variant max-w-xl">Every document is precision-engineered for retrieval, from ingestion to generation.</p>
      </div>
      
      {/* ReactFlow Container */}
      <div className="h-[400px] w-full rounded-2xl overflow-hidden glass-panel relative">
          <div className="absolute inset-0 bg-surface-container-lowest/30 z-0"></div>
          <ReactFlow
            nodes={initialNodes}
            edges={initialEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            panOnScroll={true}
            className="z-10"
          >
            <Background color="#acc7ff" gap={16} size={1} style={{ opacity: 0.1 }} />
          </ReactFlow>
          {/* Overlay gradient to fade edges nicely */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-surface-container to-transparent z-20 pointer-events-none rounded-l-2xl"></div>
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface-container to-transparent z-20 pointer-events-none rounded-r-2xl"></div>
      </div>
    </section>
  );
};

export default WorkflowSection;
