import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Paper, Typography, Tooltip, CircularProgress, Link } from '@mui/material';
import Blockies from 'react-blockies';

// We can define the data shape for our custom node
export interface StreamNodeData {
  id: string;
  streamId: string;
  provider: string;
  type?: string;
  value?: string;
  eventTime?: number;
  weight?: string;
  isTarget?: boolean; // To highlight the root node
}

// The props for our custom node component
interface StreamNodeProps {
  data: StreamNodeData;
}

export const StreamNode: React.FC<StreamNodeProps> = ({ data }) => {
  const tooltipContent = (
    <React.Fragment>
      <Typography color="inherit" sx={{ mb: 0.5 }}>
        <strong>ID:</strong> {data.id}
      </Typography>
      <Typography color="inherit" sx={{ mb: 0.5 }}>
        <strong>Provider:</strong> {data.provider}
      </Typography>
      <Typography color="inherit">
        <strong>Type:</strong> {data.type || '...'}
      </Typography>
    </React.Fragment>
  );

  const borderColor = (() => {
    if (data.isTarget) return '#1976d2'; // MUI primary.main for target
    if (data.type === 'composed') return '#ed6c02'; // MUI warning.main for composed
    if (data.type === 'primitive') return '#2e7d32'; // MUI success.main for primitive
    return '#ccc'; // Default
  })();

  const explorerUrl = `https://truf.network/explorer/${data.provider}/${data.streamId}`;

  return (
    <Link 
      href={explorerUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      sx={{ 
        textDecoration: 'none', 
        cursor: 'default',
        '&:hover .node-title': {
          textDecoration: 'underline',
        }
      }}
    >
      <Tooltip title={tooltipContent} arrow>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            width: 240,
            minHeight: 90,
            borderRadius: 1.5,
            border: `2px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative', // Needed for absolute positioning of the avatar
            cursor: 'pointer',
            transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            '&:hover': {
              boxShadow: '0 4px 20px 0 rgba(0,0,0,0.12)',
            }
          }}
        >
          {/* Handle for incoming connections */}
          <Handle type="target" position={Position.Left} />

          <Box
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              borderRadius: '50%',
              overflow: 'hidden',
            }}
          >
            <Blockies seed={data.provider.toLowerCase()} size={6} scale={4} />
          </Box>

          <Typography noWrap title={data.id} sx={{ fontWeight: 'bold', mb: 0.5, maxWidth: '90%' }} className="node-title">
            {data.id}
          </Typography>

          {data.weight && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
              Weight: {parseFloat(data.weight).toFixed(4)}
            </Typography>
          )}

          {data.value ? (
            <Box sx={{ my: 0.5 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                {parseFloat(data.value).toPrecision(8)}
              </Typography>
              {data.eventTime && (
                <Typography variant="caption" color="text.secondary">
                  {new Date(data.eventTime * 1000).toISOString()}
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Loading...
              </Typography>
            </Box>
          )}

          {/* Handle for outgoing connections */}
          <Handle type="source" position={Position.Right} />
        </Paper>
      </Tooltip>
    </Link>
  );
}; 