import { useMemo } from 'react';
import { Box, Button, CircularProgress, Typography, LinearProgress } from '@mui/material';
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
import type { LoadingProgress } from '../hooks/useStreamExplorer';

// Define LoadingOverlay component here
interface LoadingOverlayProps {
  progress: LoadingProgress;
}

const LoadingOverlay = ({ progress }: LoadingOverlayProps) => {
  let message = '';
  let value = 0;

  if (progress.stage === 'discovering') {
    message = `Discovering streams... (${progress.discovered} found)`;
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1">{message}</Typography>
        </Box>
    );
  } 
  
  if (progress.stage === 'timeline') {
    message = `Fetching data for ${progress.total} streams...`;
    if (progress.total > 0) {
        value = (progress.timelineFetched / progress.total) * 100;
    }
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>{message}</Typography>
            <Box sx={{ width: '80%', display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress variant="determinate" value={value} />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                    <Typography variant="body2" color="text.secondary">{`${Math.round(value)}%`}</Typography>
                </Box>
            </Box>
            <Typography variant="caption" sx={{ mt: 1 }}>{`${progress.timelineFetched} / ${progress.total}`}</Typography>
        </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <CircularProgress />
    </Box>
  );
};

interface ExplorePointViewProps {
  nodes: Node[];
  edges: Edge[];
  onBack: () => void;
  isLoading: boolean;
  progress: LoadingProgress;
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


export const ExplorePointView = ({ nodes: initialNodes, edges: initialEdges, onBack, isLoading, progress }: ExplorePointViewProps) => {

  const nodeTypes = useMemo(() => ({ streamNode: StreamNode }), []);

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    initialNodes,
    initialEdges
  );

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  if (isLoading) {
    return (
        <Box sx={{ height: '80vh', border: '1px solid #ddd', borderRadius: '4px' }}>
            <LoadingOverlay progress={progress} />
        </Box>
    )
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