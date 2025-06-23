import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridCellParams } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import type { QueryMode } from './QueryForm';

export interface StreamRecord {
  eventTime: number;
  value: string;
}

interface ResultsTableProps {
  data: StreamRecord[];
  mode: QueryMode;
  useUnixTime?: boolean;
  onCellClick?: (eventTime: number) => void;
  loading?: boolean;
}

export const ResultsTable = ({ 
  data, 
  mode, 
  useUnixTime = false, 
  onCellClick,
  loading = false 
}: ResultsTableProps) => {
  const formatTime = (timestamp: number) => {
    return useUnixTime ? timestamp.toString() : dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss');
  };

  const handleCellClick = (params: GridCellParams) => {
    if (onCellClick && params.row.eventTime) {
      onCellClick(params.row.eventTime);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'eventTime',
      headerName: 'Event Time',
      width: 200,
      valueFormatter: (value: number) => formatTime(value),
    },
    {
      field: 'value',
      headerName: 'Value',
      width: 300,
      flex: 1,
    },
  ];

  const rows = data.map((record, index) => ({
    id: index,
    eventTime: record.eventTime,
    value: record.value,
  }));

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Query Results ({mode})
        </Typography>
        
        <Box sx={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            onCellClick={handleCellClick}
            pageSizeOptions={[5, 10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            sx={{
              '& .MuiDataGrid-cell': {
                cursor: onCellClick ? 'pointer' : 'default',
              },
              '& .MuiDataGrid-cell:hover': {
                backgroundColor: onCellClick ? 'action.hover' : 'transparent',
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}; 