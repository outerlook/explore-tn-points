import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import dayjs from 'dayjs';

export type QueryMode = 'getRecord' | 'getIndex' | 'getIndexChange';

export interface QueryParams {
  streamId: string;
  dataProvider: string;
  mode: QueryMode;
  from?: number;
  to?: number;
  baseTime?: number;
  timeInterval?: number;
  frozenAt?: number;
}

interface QueryFormProps {
  onSubmit: (params: QueryParams) => void;
  loading?: boolean;
  initialParams?: QueryParams | null;
}

export const QueryForm = ({ onSubmit, loading = false, initialParams }: QueryFormProps) => {
  const [streamId, setStreamId] = useState('');
  const [dataProvider, setDataProvider] = useState('');
  const [mode, setMode] = useState<QueryMode>('getRecord');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [baseTimeDate, setBaseTimeDate] = useState('');
  const [timeInterval, setTimeInterval] = useState('');
  const [frozenAtDate, setFrozenAtDate] = useState('');
  const [useUnixTime, setUseUnixTime] = useState(false);

  useEffect(() => {
    if (initialParams) {
      setStreamId(initialParams.streamId || '');
      setDataProvider(initialParams.dataProvider || '');
      setMode(initialParams.mode || 'getRecord');
      
      const formatToInput = (unix: number | undefined) => {
        if (unix === undefined) return '';
        return useUnixTime ? String(unix) : dayjs.unix(unix).format('YYYY-MM-DDTHH:mm');
      }

      setFromDate(formatToInput(initialParams.from));
      setToDate(formatToInput(initialParams.to));
      setBaseTimeDate(formatToInput(initialParams.baseTime));
      setTimeInterval(initialParams.timeInterval ? String(initialParams.timeInterval) : '');
      setFrozenAtDate(formatToInput(initialParams.frozenAt));
    }
  }, [initialParams, useUnixTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params: QueryParams = {
      streamId: streamId.trim(),
      dataProvider: dataProvider.trim(),
      mode,
    };

    // Convert dates to unix timestamps if provided
    if (fromDate) {
      params.from = useUnixTime 
        ? parseInt(fromDate) 
        : dayjs(fromDate).unix();
    }
    
    if (toDate) {
      params.to = useUnixTime 
        ? parseInt(toDate) 
        : dayjs(toDate).unix();
    }

    if (baseTimeDate && mode === 'getIndex') {
      params.baseTime = useUnixTime 
        ? parseInt(baseTimeDate) 
        : dayjs(baseTimeDate).unix();
    }

    if (timeInterval && mode === 'getIndexChange') {
      params.timeInterval = parseInt(timeInterval);
    }

    if (frozenAtDate) {
      params.frozenAt = useUnixTime 
        ? parseInt(frozenAtDate) 
        : dayjs(frozenAtDate).unix();
    }

    console.log('QueryForm submitting', params);
    onSubmit(params);
  };

  const isFormValid = streamId.trim() && dataProvider.trim();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Stream Query
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Stream ID"
            value={streamId}
            onChange={(e) => setStreamId(e.target.value)}
            size="small"
            fullWidth
            required
            helperText="The unique identifier of the stream"
          />

          <TextField
            label="Data Provider"
            value={dataProvider}
            onChange={(e) => setDataProvider(e.target.value)}
            size="small"
            fullWidth
            required
            helperText="The Ethereum address of the data provider"
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Query Mode</InputLabel>
            <Select
              value={mode}
              label="Query Mode"
              onChange={(e) => setMode(e.target.value as QueryMode)}
            >
              <MenuItem value="getRecord">Get Record</MenuItem>
              <MenuItem value="getIndex">Get Index</MenuItem>
              <MenuItem value="getIndexChange">Get Index Change</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={useUnixTime}
                onChange={(e) => setUseUnixTime(e.target.checked)}
              />
            }
            label="Use Unix Timestamps"
          />

          <TextField
            label="From"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            size="small"
            fullWidth
            type={useUnixTime ? 'number' : 'datetime-local'}
            helperText={useUnixTime ? 'Unix timestamp' : 'Date and time'}
          />

          <TextField
            label="To"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            size="small"
            fullWidth
            type={useUnixTime ? 'number' : 'datetime-local'}
            helperText={useUnixTime ? 'Unix timestamp' : 'Date and time'}
          />

          {mode === 'getIndex' && (
            <TextField
              label="Base Time"
              value={baseTimeDate}
              onChange={(e) => setBaseTimeDate(e.target.value)}
              size="small"
              fullWidth
              type={useUnixTime ? 'number' : 'datetime-local'}
              helperText={useUnixTime ? 'Unix timestamp for base calculation' : 'Base date and time for index calculation'}
            />
          )}

          {mode === 'getIndexChange' && (
            <TextField
              label="Time Interval (seconds)"
              value={timeInterval}
              onChange={(e) => setTimeInterval(e.target.value)}
              size="small"
              fullWidth
              type="number"
              helperText="Time interval in seconds for index change calculation"
              required
            />
          )}

          <TextField
            label="Frozen At (optional)"
            value={frozenAtDate}
            onChange={(e) => setFrozenAtDate(e.target.value)}
            size="small"
            fullWidth
            type={useUnixTime ? 'number' : 'datetime-local'}
            helperText={useUnixTime ? 'Unix timestamp to freeze data at' : 'Date and time to freeze data at'}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={!isFormValid || loading}
            fullWidth
          >
            {loading ? 'Querying...' : 'Query Stream'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}; 