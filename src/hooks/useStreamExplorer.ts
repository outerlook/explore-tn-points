import { useState, useEffect } from 'react';
import { useTNClient } from '../contexts/TNClientProvider';
import type { StreamLocator } from '@trufnetwork/sdk-js';
import type { Node, Edge } from 'reactflow';
import pLimit from 'p-limit';
import type { QueryMode } from '../components/QueryForm';
import type { StreamNodeData } from '../components/StreamNode';
import type { TimelineData, TimelineStream } from '../components/TimelineContainer';

interface UseStreamExplorerProps {
  streamLocator: StreamLocator | null;
  targetTime: number;
  level: number;
  mode: QueryMode;
  baseTime?: number;
  timeInterval?: number;
}

const getFlowNodeId = (locator: StreamLocator) => 
  `${locator.streamId.getId()}-${locator.dataProvider.getAddress()}`;

export const useStreamExplorer = ({
  streamLocator,
  targetTime,
  level,
  mode,
  baseTime,
  timeInterval,
}: UseStreamExplorerProps) => {
  const { client } = useTNClient();

  const [nodes, setNodes] = useState<Node<StreamNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalDiscovered, setTotalDiscovered] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState<'traversing' | 'fetching_timeline' | 'done'>('traversing');

  useEffect(() => {
    if (!client || !streamLocator) return;

    const fetchData = async () => {
      setIsLoading(true);
      setLoadingStatus('traversing');
      setError(null);
      setNodes([]);
      setEdges([]);
      setTimelineData(null);
      setProcessedCount(0);
      setTotalDiscovered(0);

      const limit = pLimit(5);
      const processedNodes = new Set<string>();
      const allStreams: Omit<TimelineStream, 'records'>[] = [];

      const traverse = async (locator: StreamLocator, currentLevel: number, parentFlowId?: string, weight?: string, childIndex?: number) => {
        const flowId = getFlowNodeId(locator);
        allStreams.push({ locator, weight, parentFlowId, flowId });

        // Graph data
        if (processedNodes.has(flowId) || currentLevel < 0) {
            if(parentFlowId) setEdges((eds) => [...eds, { id: `e-${parentFlowId}-${flowId}-${childIndex ?? 0}`, source: parentFlowId, target: flowId, animated: true }]);
            return;
        }
        processedNodes.add(flowId);

        try {
          const streamAction = client.loadAction();
          const [type, record, taxonomy] = await Promise.all([
            limit(() => streamAction.getType(locator)),
            limit(() => streamAction.getRecord({ stream: locator, from: targetTime, to: targetTime })),
            limit(() => client.loadComposedAction().describeTaxonomies({ stream: locator, latestGroupSequence: true }).catch(() => null)),
          ]);

          const nodeData: StreamNodeData = { id: locator.streamId.getName() || locator.streamId.getId(), streamId: locator.streamId.getId(), provider: locator.dataProvider.getAddress(), type, value: record?.[0]?.value, eventTime: record?.[0]?.eventTime, isTarget: currentLevel === level, weight };
          setNodes((nds) => [...nds, { id: flowId, type: 'streamNode', data: nodeData, position: { x: 0, y: 0 } }]);
          if (parentFlowId) setEdges((eds) => [...eds, { id: `e-${parentFlowId}-${flowId}-${childIndex ?? 0}`, source: parentFlowId, target: flowId }]);

          setProcessedCount((c) => c + 1);

          const childItems = taxonomy?.[0]?.taxonomyItems || [];
          if (type === 'composed' && currentLevel > 0 && childItems.length > 0) {
            await Promise.all(childItems.map((item, index) => traverse(item.childStream, currentLevel - 1, flowId, item.weight, index)));
          }
        } catch (e) {
          setError(e instanceof Error ? e : new Error('An unknown error occurred'));
        }
      };

      await traverse(streamLocator, level);
      
      setTotalDiscovered(allStreams.length);
      setLoadingStatus('fetching_timeline');

      // Fetch timeline data
      const streamAction = client.loadAction();

      const timelineRecords = await Promise.all(
        allStreams.map(s => limit(() => streamAction.getRecord({ stream: s.locator, from: targetTime, to: targetTime })))
      );
      
      const timelineStreams: TimelineStream[] = allStreams.map((s, i) => ({
        ...s,
        records: timelineRecords[i],
      }));

      setTimelineData({
          streams: timelineStreams,
      });

      setIsLoading(false);
      setLoadingStatus('done');
    };

    fetchData();
  }, [client, streamLocator, targetTime, level, mode, baseTime, timeInterval]);

  return { nodes, edges, timelineData, isLoading, error, processedCount, totalDiscovered, loadingStatus };
}; 