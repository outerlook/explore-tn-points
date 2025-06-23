import { useState, useEffect } from 'react';
import type { QueryMode } from '../components/QueryForm';
import { useTNClient } from '../contexts/TNClientProvider';
import { StreamId, EthereumAddress } from '@trufnetwork/sdk-js';
import type { StreamLocator, StreamRecord, TaxonomyItem } from '@trufnetwork/sdk-js';
import pLimit from 'p-limit';

interface UseStreamTimelineProps {
  streamId: string;
  dataProvider: string;
  eventTime: number;
  mode: QueryMode;
  baseTime?: number;
  timeInterval?: number;
}

export interface TimelineData {
  parent: {
    locator: StreamLocator;
    records: StreamRecord[];
  };
  children: {
    locator: StreamLocator;
    records: StreamRecord[];
    weight: string;
  }[];
}

export const useStreamTimeline = ({
  streamId,
  dataProvider,
  eventTime,
  mode,
  baseTime,
  timeInterval,
}: UseStreamTimelineProps) => {
  const { client } = useTNClient();
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!client) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const streamLocator = {
          streamId: StreamId.fromString(streamId).throw(),
          dataProvider: EthereumAddress.fromString(dataProvider).throw(),
        };

        const streamAction = client.loadAction();
        const limit = pLimit(5);

        // Define a time window (e.g., 1 hour before and after the event time)
        const from = eventTime - 3600;
        const to = eventTime + 3600;

        // Fetch parent records and taxonomy
        const [parentRecords, taxonomy] = await Promise.all([
          limit(() => streamAction.getRecord({ stream: streamLocator, from, to })),
          limit(() => client.loadComposedAction().describeTaxonomies({ stream: streamLocator, latestGroupSequence: true }).catch(() => null)),
        ]);
        
        const childItems = taxonomy?.[0]?.taxonomyItems || [];
        
        // Fetch records for all children
        const childrenData = await Promise.all(
          childItems.map((item: TaxonomyItem) =>
            limit(async () => {
              const records = await streamAction.getRecord({ stream: item.childStream, from, to });
              return {
                locator: item.childStream,
                records,
                weight: item.weight,
              };
            })
          )
        );

        setData({
          parent: { locator: streamLocator, records: parentRecords },
          children: childrenData,
        });

      } catch (e) {
        setError(e instanceof Error ? e : new Error('An unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [client, streamId, dataProvider, eventTime, mode, baseTime, timeInterval]);

  return { data, loading, error };
}; 