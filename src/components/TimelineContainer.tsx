import { useMemo, useEffect, useRef } from 'react';
import { Typography, Paper } from '@mui/material';
import type { StreamLocator, StreamRecord } from '@trufnetwork/sdk-js';
import { Timeline, DataSet, type DataGroup, type DataItem } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import './timeline.css';

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

    const { groups, items } = useMemo(() => {
        if (!data || !data.streams.length) return { groups: new DataSet(), items: new DataSet() };

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
            const group: DataGroup & { children: string[] } = {
                id: stream.flowId,
                content: stream.locator.streamId.getName() || stream.locator.streamId.getId(),
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

        const finalItems: DataItem[] = data.streams.flatMap(stream => {
            const depth = getDepth(stream);
            return stream.records.map((r, i) => ({
                id: `${stream.flowId}-${i}`,
                group: stream.flowId,
                start: new Date(r.eventTime * 1000),
                type: 'point',
                className: `item-depth-${depth}`,
                content: '',
            }));
        });

        return {
            groups: new DataSet(allGroups),
            items: new DataSet(finalItems),
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

        return () => timeline.destroy();

    }, [groups, items, data, targetTime]);
    
    if (!data) return <Typography>Loading timeline...</Typography>;

    return (
        <Paper sx={{ height: '80vh', position: 'relative' }}>
             <style>{`
                .vis-custom-time.target { border-color: red; }
            `}</style>
            <div ref={timelineRef} style={{ height: '100%' }} />
        </Paper>
    );
}; 