import { useMemo } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import ReactFlow, { 
    Controls, 
    MiniMap, 
    Background, 
    Panel, 
    useNodesState, 
    useEdgesState,
    Position,
    type Node,
    type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { StreamNode } from './StreamNode';

interface ExplorePointViewProps {
  nodes: Node[];
  edges: Edge[];
  onBack: () => void;
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 300, height: 150 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // We are shifting the dagre node position (anchor=center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - 150, // half of width
      y: nodeWithPosition.y - 75, // half of height
    };

    return node;
  });

  return { nodes, edges };
};


export const ExplorePointView = ({ nodes: initialNodes, edges: initialEdges, onBack }: ExplorePointViewProps) => {

  const nodeTypes = useMemo(() => ({ streamNode: StreamNode }), []);

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    initialNodes,
    initialEdges
  );

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  if (initialNodes.length === 0) {
    return <CircularProgress />
  }

  return (
    <Box sx={{ height: '80vh', border: '1px solid #ddd', borderRadius: '4px', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
        <Panel position="top-left">
          <Button onClick={onBack} variant="contained" size="small">
            Back to Query
          </Button>
        </Panel>
      </ReactFlow>
    </Box>
  );
}; 