import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  LinearProgress,
} from '@mui/material';
import { StreamId, EthereumAddress } from '@trufnetwork/sdk-js';
import ReactFlow, { MiniMap, Controls, Background, type Node, type Edge, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

import { useTNClient } from '../contexts/TNClientProvider';
import { useStreamCompositionGraph } from '../hooks/useStreamCompositionGraph';
import { StreamNode } from './StreamNode';
import type { QueryMode } from './QueryForm';

// Dagre graph layout
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 240;
const nodeHeight = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'LR' }); // Left-to-right layout

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Left;
    node.sourcePosition = Position.Right;
    // We are shifting the dagre node position (anchor=center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
};


interface ExplorePointViewProps {
  streamId: string;
  dataProvider: string;
  eventTime: number;
  mode: QueryMode;
  baseTime?: number;
  timeInterval?: number;
  onBack: () => void;
}

export const ExplorePointView = ({ 
  streamId, 
  dataProvider, 
  eventTime,
  mode,
  baseTime,
  timeInterval,
  onBack 
}: ExplorePointViewProps) => {
  const { isConnected } = useTNClient();
  const [compositionLevel, setCompositionLevel] = React.useState(2);

  const streamLocator = React.useMemo(() => {
    try {
      return {
        streamId: StreamId.fromString(streamId).throw(),
        dataProvider: EthereumAddress.fromString(dataProvider).throw(),
      };
    } catch {
      return null;
    }
  }, [streamId, dataProvider]);

  const {
    nodes: unlayoutedNodes,
    edges,
    isLoading,
    isError,
    error,
    progress,
  } = useStreamCompositionGraph({
    streamLocator: streamLocator!,
    targetTime: eventTime,
    level: compositionLevel,
    mode,
    baseTime,
    timeInterval,
  });

  const { nodes, edges: layoutedEdges } = useMemo(() => {
    if (unlayoutedNodes.length > 0) {
        return getLayoutedElements(unlayoutedNodes, edges);
    }
    return { nodes: [], edges: [] };
  }, [unlayoutedNodes, edges]);

  // Define custom node types for React Flow
  const nodeTypes = useMemo(() => ({ streamNode: StreamNode }), []);

  return (
    <Card sx={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
          <Button onClick={onBack} variant="outlined" size="small">
            ← Back
          </Button>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Explore Point
          </Typography>
          <TextField
            label="Composition Levels"
            type="number"
            size="small"
            value={compositionLevel}
            onChange={(e) => setCompositionLevel(parseInt(e.target.value) || 1)}
            inputProps={{ min: 1, max: 10 }}
            sx={{ width: 180 }}
            helperText="How many levels to explore"
          />
        </Box>

        <Box sx={{ flexGrow: 1, position: 'relative' }}>
        {!isConnected ? (
          <Alert severity="warning">Please connect to the TN Client first.</Alert>
        ) : !streamLocator ? (
          <Alert severity="error">Invalid Stream ID or Data Provider format.</Alert>
        ) : isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography sx={{ mb: 2 }}>
              Loading Composition... ({progress.fetched} / {progress.total})
            </Typography>
            <Box sx={{ width: '50%' }}>
              <LinearProgress variant="determinate" value={(progress.fetched / progress.total) * 100} />
            </Box>
          </Box>
        ) : isError ? (
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Failed to load composition graph.'}
          </Alert>
        ) : (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <ReactFlow
              nodes={nodes}
              edges={layoutedEdges}
              nodeTypes={nodeTypes}
              fitView
            >
              <Controls />
              <MiniMap />
              <Background gap={16} />
            </ReactFlow>
          </Box>
        )}
        </Box>
      </CardContent>
    </Card>
  );
}; 