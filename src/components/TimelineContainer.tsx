import { Box, Typography } from '@mui/material';
import type { StreamLocator, StreamRecord } from '@trufnetwork/sdk-js';

export interface TimelineData {
  parent: {
    locator: StreamLocator;
    records: StreamRecord[];
  };
  children: {
    locator: StreamLocator;
    records: StreamRecord[];
    weight?: string;
  }[];
}

interface TimelineContainerProps {
    data: TimelineData | null
}

export const TimelineContainer = ({ data }: TimelineContainerProps) => {
  if (!data) {
    return <Typography>Loading timeline...</Typography>;
  }

  return (
    <Box sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Typography variant="h6">Composition Timeline</Typography>
      <Typography>Parent: {data.parent.locator.streamId.getName()}</Typography>
      {/* TODO: Render timeline lanes for parent and children */}
    </Box>
  );
}; 