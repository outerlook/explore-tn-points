import { useMemo, useEffect, useRef, useState } from 'react';
import { Typography, Paper } from '@mui/material';
import type { StreamLocator, StreamRecord } from '@trufnetwork/sdk-js';
import { Timeline, DataSet, type DataGroup, type DataItem } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import './timeline.css';
import { CustomTooltip } from './CustomTooltip';
import type { TooltipContent } from './CustomTooltip';

type CustomDataItem = DataItem & { meta?: TooltipContent };

export interface TimelineStream {
    locator: StreamLocator;
    records: StreamRecord[];
    weight?: string;
    parentFlowId?: string;
    flowId: string;
}

export interface TimelineData {
    streams: TimelineStream[];
}

interface TimelineContainerProps {
    data: TimelineData | null;
    targetTime: number;
}

export const TimelineContainer = ({ data, targetTime }: TimelineContainerProps) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<{
        content: TooltipContent | null;
        position: { top: number; left: number };
    }>({ content: null, position: { top: 0, left: 0 } });

    const { groups, items } = useMemo(() => {
        if (!data || !data.streams.length) return { groups: new DataSet<DataGroup>(), items: new DataSet<CustomDataItem>() };

        const allGroups: DataGroup[] = [];
        const groupMap = new Map<string, DataGroup & { children: string[] }>();

        const getDepth = (s: TimelineStream): number => {
            let depth = 0;
            let current = s;
            while (current.parentFlowId) {
                const parent = data.streams.find(p => p.flowId === current.parentFlowId);
                if (!parent) break;
                depth += 1;
                current = parent;
            }
            return depth;
        };

        data.streams.forEach(stream => {
            const depth = getDepth(stream);
            const streamId = stream.locator.streamId.getId();
            const provider = stream.locator.dataProvider.getAddress();
            const streamName = stream.locator.streamId.getName() || streamId;
            const explorerUrl = `https://truf.network/explorer/${provider}/${streamId}`;

            const group: DataGroup & { children: string[] } = {
                id: stream.flowId,
                content: `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="stream-link" style="color: inherit; text-decoration: none;">${streamName}</a>`,
                className: `group-depth-${depth}`,
                children: []
            };
            allGroups.push(group);
            groupMap.set(stream.flowId, group);
        });

        // Second pass: build the hierarchy
        const rootGroups: DataGroup[] = [];
        allGroups.forEach(group => {
            const stream = data.streams.find(s => s.flowId === group.id);
            if (stream && stream.parentFlowId && groupMap.has(stream.parentFlowId)) {
                const parent = groupMap.get(stream.parentFlowId);
                if (parent) {
                    parent.children.push(group.id as string);
                }
            } else {
                rootGroups.push(group);
            }
        });

        // Assign nestedGroups property
        allGroups.forEach(group => {
            const mappedGroup = groupMap.get(group.id as string);
            if (mappedGroup && mappedGroup.children.length > 0) {
                group.nestedGroups = mappedGroup.children;
                // expand root by default
                if (!data.streams.find(s => s.flowId === group.id)?.parentFlowId) {
                    group.showNested = true;
                }
            }
        });

        const finalItems: CustomDataItem[] = data.streams.flatMap(stream => {
            const depth = getDepth(stream);
            return stream.records.map((r, i) => ({
                id: `${stream.flowId}-${i}`,
                group: stream.flowId,
                start: new Date(r.eventTime * 1000),
                type: 'point',
                className: `item-depth-${depth}`,
                content: '',
                meta: {
                    streamId: stream.locator.streamId.getName() || stream.locator.streamId.getId(),
                    rawStreamId: stream.locator.streamId.getId(),
                    provider: stream.locator.dataProvider.getAddress(),
                    value: r.value,
                    eventTime: new Date(r.eventTime * 1000).toLocaleString(),
                    weight: stream.weight,
                }
            }));
        });

        return {
            groups: new DataSet<DataGroup>(allGroups),
            items: new DataSet<CustomDataItem>(finalItems),
        };
    }, [data]);

    useEffect(() => {
        if (!timelineRef.current || !data) return;

        const options = {
            height: '100%',
            stack: false,
            verticalScroll: true,
        };
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timeline = new Timeline(timelineRef.current, items as any, groups as any, options);
        timeline.addCustomTime(new Date(targetTime * 1000), 'target');

        timeline.on('mouseOver', (props) => {
            const { item, event } = props;
            if (!item || !timelineRef.current) {
                setTooltip({ content: null, position: { top: 0, left: 0 } });
                return;
            }
            
            const rawItemData = items.get(item);
            const itemData = Array.isArray(rawItemData) ? rawItemData[0] : rawItemData;

            if (itemData && itemData.meta) {
                const timelineRect = timelineRef.current.getBoundingClientRect();
                const itemRect = (event.target as HTMLElement).getBoundingClientRect();

                setTooltip({
                    content: itemData.meta,
                    position: {
                        top: itemRect.top - timelineRect.top - 8,
                        left: itemRect.left - timelineRect.left + itemRect.width / 2,
                    },
                });
            }
        });

        return () => {
            timeline.off('mouseOver');
            timeline.destroy();
        }

    }, [groups, items, data, targetTime]);
    
    if (!data) return <Typography>Loading timeline...</Typography>;

    return (
        <Paper sx={{ height: '80vh', position: 'relative' }}>
            <CustomTooltip content={tooltip.content} position={tooltip.position} />
            <style>{`
                .vis-custom-time.target { border-color: red; }
            `}</style>
            <div ref={timelineRef} style={{ height: '100%' }} />
        </Paper>
    );
}; 