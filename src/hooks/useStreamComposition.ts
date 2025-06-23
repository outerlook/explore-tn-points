import { useQueries } from '@tanstack/react-query';
import { useTNClient } from '../contexts/TNClientProvider';
import type { StreamLocator } from '@trufnetwork/sdk-js';

interface UseStreamCompositionParams {
  streamLocator: StreamLocator;
  targetTime: number;
}

export const useStreamComposition = ({ streamLocator, targetTime }: UseStreamCompositionParams) => {
  const { client } = useTNClient();

  const results = useQueries({
    queries: [
      {
        queryKey: ['streamType', streamLocator],
        queryFn: () => client!.loadAction().getType(streamLocator),
        enabled: !!client,
      },
      {
        queryKey: ['lastRecord', streamLocator, targetTime],
        queryFn: async () => {
          if (!client) return null;
          // get record, when doesn't exist on that date, fetches the previous day
          const records = await client.loadAction().getRecord({
            stream: streamLocator,
            to: targetTime ? Number(targetTime) : undefined,
            from: targetTime ? Number(targetTime) : undefined,
          });
          // The backend should return the single latest record at or before the target time
          if (records && records.length > 0) {
            return records[0];
          }
          return null;
        },
        enabled: !!client,
      },
      {
        queryKey: ['taxonomy', streamLocator],
        queryFn: () => client!.loadComposedAction().describeTaxonomies({ stream: streamLocator, latestGroupSequence: true }),
        enabled: !!client,
      },
    ],
  });

  const streamTypeQuery = results[0];
  const lastRecordQuery = results[1];
  const taxonomyQuery = results[2];

  const isComposed = streamTypeQuery.data === 'composed';

  // The taxonomy query should only be considered if the stream is composed
  const taxonomyData = isComposed ? taxonomyQuery.data : undefined;

  return {
    streamType: streamTypeQuery.data,
    lastRecord: lastRecordQuery.data,
    taxonomy: taxonomyData,
    isLoading: results.some(q => q.isLoading),
    isError: results.some(q => q.isError),
    error: results.find(q => q.error)?.error,
  };
};

