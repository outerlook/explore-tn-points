import { Paper, Typography, Box, Link } from '@mui/material';

export interface TooltipContent {
  streamId: string;
  rawStreamId: string;
  provider: string;
  value: string;
  eventTime: string;
  weight?: string;
}

interface CustomTooltipProps {
  content: TooltipContent | null;
  position: { top: number; left: number };
}

export const CustomTooltip = ({ content, position }: CustomTooltipProps) => {
  if (!content) {
    return null;
  }
  const explorerUrl = `https://truf.network/explorer/${content.provider}/${content.rawStreamId}`;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        p: 1.5,
        bgcolor: 'background.paper',
        pointerEvents: 'none',
        transform: 'translate(-50%, -100%)',
        zIndex: 1000,
        minWidth: 250,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
        <Link 
          href={explorerUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          sx={{ 
            color: 'inherit',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            } 
          }}
        >
          {content.streamId}
        </Link>
      </Typography>
      <Box component="table" sx={{ fontSize: '0.8rem' }}>
        <tbody>
          <tr><td><strong>Provider:</strong></td><td style={{ paddingLeft: '8px' }}>{content.provider}</td></tr>
          <tr><td><strong>Value:</strong></td><td style={{ paddingLeft: '8px' }}>{content.value}</td></tr>
          <tr><td><strong>Time:</strong></td><td style={{ paddingLeft: '8px' }}>{content.eventTime}</td></tr>
          {content.weight && (
            <tr><td><strong>Weight:</strong></td><td style={{ paddingLeft: '8px' }}>{content.weight}</td></tr>
          )}
        </tbody>
      </Box>
    </Paper>
  );
}; 