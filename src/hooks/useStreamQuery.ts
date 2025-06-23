import { useQuery } from '@tanstack/react-query';
import { useTNClient } from '../contexts/TNClientProvider';
import type { QueryParams } from '../components/QueryForm';
import { StreamId, EthereumAddress } from '@trufnetwork/sdk-js';

export const useStreamQuery = (params: QueryParams | null) => {
  const { client, isConnected } = useTNClient();

  return useQuery({
    queryKey: ['streamQuery', params],
    queryFn: async () => {
      console.log('useStreamQuery: starting query', params);
      if (!isConnected || !params) {
        console.log('useStreamQuery: not connected or missing params');
        return [];
      }

      const streamAction = client!.loadAction();

      const streamLocator = {
        streamId: StreamId.fromString(params.streamId).throw(),
        dataProvider: EthereumAddress.fromString(params.dataProvider).throw(),
      };

      const queryOptions = {
        stream: streamLocator,
        from: params.from ? Number(params.from) : undefined,
        to: params.to ? Number(params.to) : undefined,
        frozenAt: params.frozenAt,
      };

      // Helper to find the last record before a certain time
      const findLastRecord = async (time: number) => {
        console.log('useStreamQuery: finding last record', time);
        const recs = await streamAction.getRecord({
          stream: streamLocator,
          from: time,
          to: time,   // ← single-point query
        });
        // SDK guarantees 0 or 1 elements under the new rule
        return recs;
      };

      // Initial query execution
      let results = [];
      switch (params.mode) {
        case 'getIndex':
          results = await streamAction.getIndex({
            ...queryOptions,
            baseTime: params.baseTime,
          });
          break;
        case 'getIndexChange':
          if (params.timeInterval === undefined) {
            throw new Error('timeInterval is required for getIndexChange mode');
          }
          results = await streamAction.getIndexChange({
            ...queryOptions,
            timeInterval: params.timeInterval,
          });
          break;
        case 'getRecord':
        default:
          console.log('useStreamQuery: getting record', queryOptions);
          results = await streamAction.getRecord(queryOptions);
          break;
      }

      // If the query for a specific point-in-time returns no results, try the fallback
      if (
        results.length === 0 &&
        params.from &&
        params.to &&
        params.from === params.to &&
        params.mode !== 'getIndexChange' // Fallback doesn't apply to getIndexChange
      ) {
        console.log('Performing fallback query for point-in-time...');
        return findLastRecord(params.to);
      }

      console.log('useStreamQuery: returning results', results);
      return results;
    },
    enabled: isConnected && !!params,
    retry: false,
  });
}; 