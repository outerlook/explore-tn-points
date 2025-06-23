import { useState, useEffect } from 'react';
import type { StreamLocator, TaxonomyItem, StreamRecord } from '@trufnetwork/sdk-js';
import { useTNClient } from '../contexts/TNClientProvider';
import type { Node, Edge } from 'reactflow';
import type { StreamNodeData } from '../components/StreamNode';
import pLimit from 'p-limit';
import type { QueryMode } from '../components/QueryForm';

interface UseStreamCompositionGraphProps {
  streamLocator: StreamLocator;
  targetTime: number;
  level: number;
  mode: QueryMode;
  baseTime?: number;
  timeInterval?: number;
}

interface Progress {
  fetched: number;
  total: number;
}

// We need a stable, unique ID for each node in React Flow.
const getFlowNodeId = (locator: StreamLocator) => 
  `${locator.streamId.getId()}-${locator.dataProvider.getAddress()}`;

export const useStreamCompositionGraph = ({
  streamLocator,
  targetTime,
  level,
  mode,
  baseTime,
  timeInterval,
}: UseStreamCompositionGraphProps) => {
  const { client } = useTNClient();

  const [nodes, setNodes] = useState<Node<StreamNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<Progress>({ fetched: 0, total: 0 });

  useEffect(() => {
    if (!client || !streamLocator) {
      return;
    }

    const fetchData = async () => {
      // Reset state for new fetches
      setIsLoading(true);
      setIsError(false);
      setError(null);
      setNodes([]);
      setEdges([]);
      setProgress({ fetched: 0, total: 1 }); // Start with the root node

      const limit = pLimit(4);
      const processedNodes = new Set<string>();

      const traverse = async (
        locator: StreamLocator, 
        currentLevel: number, 
        parentFlowId?: string,
        weight?: string,
        childIndex?: number,
      ) => {
        const flowId = getFlowNodeId(locator);

        // Append childIndex to edge ID to ensure uniqueness for multi-edges
        const edgeId = `e-${parentFlowId}-${flowId}-${childIndex ?? 0}`;

        if (processedNodes.has(flowId) || currentLevel < 0) {
          if (parentFlowId) {
            setEdges((eds) => {
              if (eds.some(e => e.id === edgeId)) return eds;
              return [...eds, {
                id: edgeId,
                source: parentFlowId,
                target: flowId,
                animated: true,
              }];
            });
          }
          return;
        }
        
        processedNodes.add(flowId);
        
        try {
          const streamAction = client.loadAction();

          // Fetch the record based on the query mode
          const fetchRecordForNode = async (): Promise<StreamRecord | null> => {
            let records: StreamRecord[] = [];
            const options = { stream: locator, from: targetTime, to: targetTime };

            switch (mode) {
              case 'getIndex':
                records = await streamAction.getIndex({ ...options, baseTime });
                break;
              case 'getIndexChange':
                if (timeInterval === undefined) {
                  // This should ideally not happen if the form validation is correct
                  return null; 
                }
                records = await streamAction.getIndexChange({ ...options, timeInterval });
                break;
              case 'getRecord':
              default:
                records = await streamAction.getRecord(options);
                break;
            }

            // The SDK should return the single latest record at or before the target time
            if (records && records.length > 0) {
              return records[0];
            }
            return null;
          };

          const [type, record, taxonomy] = await Promise.all([
            limit(() => streamAction.getType(locator)),
            limit(() => fetchRecordForNode()),
            limit(() => client.loadComposedAction().describeTaxonomies({ stream: locator, latestGroupSequence: true }).catch(() => null)),
          ]);

          const nodeData: StreamNodeData = {
            id: locator.streamId.getName() || locator.streamId.getId(),
            streamId: locator.streamId.getId(),
            provider: locator.dataProvider.getAddress(),
            type,
            value: record?.value,
            eventTime: record?.eventTime,
            isTarget: currentLevel === level,
            weight,
          };

          setNodes((nds) => [...nds, {
            id: flowId,
            type: 'streamNode',
            data: nodeData,
            position: { x: 0, y: 0 },
          }]);
          
          if (parentFlowId) {
            setEdges((eds) => {
              if (eds.some(e => e.id === edgeId)) return eds;
              return [...eds, { id: edgeId, source: parentFlowId, target: flowId }];
            });
          }

          setProgress((p) => ({ ...p, fetched: p.fetched + 1 }));

          const childItems = taxonomy?.[0]?.taxonomyItems || [];
          if (type === 'composed' && currentLevel > 0 && childItems.length > 0) {
            setProgress((p) => ({ ...p, total: p.total + childItems.length }));
            await Promise.all(
              childItems.map((item: TaxonomyItem, index: number) => 
                traverse(item.childStream, currentLevel - 1, flowId, item.weight, index)
              )
            );
          }
        } catch (e) {
            console.error("Failed to fetch node data:", e)
            setIsError(true);
            setError(e instanceof Error ? e : new Error('An unknown error occurred'));
        }
      };

      await traverse(streamLocator, level);
      setIsLoading(false);
    };

    fetchData();

  }, [client, streamLocator, targetTime, level, mode, baseTime, timeInterval]);

  return { nodes, edges, isLoading, isError, error, progress };
}; 