import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material';
import type { LoadingProgress } from '../hooks/useStreamExplorer';

interface LoadingOverlayProps {
  progress: LoadingProgress;
}

export const LoadingOverlay = ({ progress }: LoadingOverlayProps) => {
  let message = '';
  let value = 0;

  if (progress.stage === 'discovering') {
    message = `Discovering streams... (${progress.discovered} found)`;
    // Indeterminate progress during discovery
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1">{message}</Typography>
        </Box>
    );
  } 
  
  if (progress.stage === 'timeline') {
    message = `Fetching data for ${progress.total} streams...`;
    if (progress.total > 0) {
        value = (progress.timelineFetched / progress.total) * 100;
    }
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>{message}</Typography>
            <Box sx={{ width: '80%', display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress variant="determinate" value={value} />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                    <Typography variant="body2" color="text.secondary">{`${Math.round(value)}%`}</Typography>
                </Box>
            </Box>
            <Typography variant="caption" sx={{ mt: 1 }}>{`${progress.timelineFetched} / ${progress.total}`}</Typography>
        </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <CircularProgress />
    </Box>
  );
}; 