import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Paper,
  Box,
  Typography,
  Alert,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Routes, Route, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { ConnectionManager } from './components/ConnectionManager';
import { QueryForm } from './components/QueryForm';
import { ResultsTable } from './components/ResultsTable';
import { ExplorePointView } from './components/ExplorePointView';
import type { QueryParams, QueryMode } from './components/QueryForm';
import { useStreamQuery } from './hooks/useStreamQuery';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

const QueryView = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParams: QueryParams | null = React.useMemo(() => {
    const streamId = searchParams.get('streamId');
    const dataProvider = searchParams.get('dataProvider');
    const mode = searchParams.get('mode') as QueryMode;

    if (!streamId || !dataProvider || !mode) {
      return null;
    }

    return {
      streamId,
      dataProvider,
      mode,
      from: searchParams.has('from') ? Number(searchParams.get('from')) : undefined,
      to: searchParams.has('to') ? Number(searchParams.get('to')) : undefined,
      baseTime: searchParams.has('baseTime') ? Number(searchParams.get('baseTime')) : undefined,
      timeInterval: searchParams.has('timeInterval') ? Number(searchParams.get('timeInterval')) : undefined,
      frozenAt: searchParams.has('frozenAt') ? Number(searchParams.get('frozenAt')) : undefined,
    };
  }, [searchParams]);

  const { data: queryResults, isLoading, error: queryError } = useStreamQuery(queryParams);

  const handleQuerySubmit = (params: QueryParams) => {
    const newSearchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        newSearchParams.set(key, String(value));
      }
    });
    setSearchParams(newSearchParams);
  };

  const handleCellClick = (eventTime: number) => {
    if (queryParams) {
      const exploreParams = new URLSearchParams({
        eventTime: String(eventTime),
        mode: queryParams.mode,
      });

      if (queryParams.baseTime) {
        exploreParams.set('baseTime', String(queryParams.baseTime));
      }
      if (queryParams.timeInterval) {
        exploreParams.set('timeInterval', String(queryParams.timeInterval));
      }

      navigate(`/explore/${queryParams.dataProvider}/${queryParams.streamId}?${exploreParams.toString()}`);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
      <Box sx={{ flex: { xs: 1, md: '0 0 400px' } }}>
        <Paper sx={{ p: 2, height: 'fit-content' }}>
          <ConnectionManager />
          <QueryForm
            onSubmit={handleQuerySubmit}
            loading={isLoading}
            initialParams={queryParams}
          />
        </Paper>
      </Box>
      <Box sx={{ flex: 1 }}>
        {queryError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {queryError instanceof Error ? queryError.message : 'An unknown error occurred.'}
          </Alert>
        )}
        <ResultsTable
          data={queryResults || []}
          mode={queryParams?.mode || 'getRecord'}
          onCellClick={handleCellClick}
          loading={isLoading}
        />
      </Box>
    </Box>
  );
};

const ExploreView = () => {
    const navigate = useNavigate();
    const { dataProvider, streamId } = useParams<{ dataProvider: string; streamId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const eventTime = searchParams.get('eventTime');
    const mode = searchParams.get('mode') as QueryMode | undefined;
    const baseTime = searchParams.get('baseTime');
    const timeInterval = searchParams.get('timeInterval');

    const [editableMode, setEditableMode] = useState(mode);
    const [editableEventTime, setEditableEventTime] = useState(eventTime || '');
    const [editableBaseTime, setEditableBaseTime] = useState(baseTime || '');
    const [editableTimeInterval, setEditableTimeInterval] = useState(timeInterval || '');

    useEffect(() => {
      setEditableMode(mode);
      setEditableEventTime(eventTime || '');
      setEditableBaseTime(baseTime || '');
      setEditableTimeInterval(timeInterval || '');
    }, [mode, eventTime, baseTime, timeInterval]);

    const handleUpdateParams = () => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('eventTime', editableEventTime);
      newSearchParams.set('mode', editableMode as string);

      if (editableMode === 'getIndex') {
        newSearchParams.set('baseTime', editableBaseTime);
        newSearchParams.delete('timeInterval');
      } else if (editableMode === 'getIndexChange') {
        newSearchParams.set('timeInterval', editableTimeInterval);
        newSearchParams.delete('baseTime');
      } else {
        newSearchParams.delete('baseTime');
        newSearchParams.delete('timeInterval');
      }

      setSearchParams(newSearchParams);
    };
  
    if (!dataProvider || !streamId || !eventTime || !mode) {
      return <Alert severity="error">Missing required parameters for exploration.</Alert>;
    }
  
    return (
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box sx={{ flex: { xs: 1, md: '0 0 400px' } }}>
          <Paper sx={{ p: 2, height: 'fit-content' }}>
            <ConnectionManager />
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">Exploring Stream</Typography>

              <FormControl size="small" fullWidth sx={{ mt: 2 }}>
                <InputLabel>Query Mode</InputLabel>
                <Select
                  value={editableMode}
                  label="Query Mode"
                  onChange={(e) => setEditableMode(e.target.value as QueryMode)}
                >
                  <MenuItem value="getRecord">Get Record</MenuItem>
                  <MenuItem value="getIndex">Get Index</MenuItem>
                  <MenuItem value="getIndexChange">Get Index Change</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ my: 2 }}>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  <strong>ID:</strong> {streamId}
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  <strong>Provider:</strong> {dataProvider}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  <strong>Mode:</strong> {mode}
                </Typography>
                {mode === 'getIndex' && baseTime && (
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    <strong>Base Time:</strong> {new Date(Number(baseTime) * 1000).toISOString()}
                  </Typography>
                )}
                {mode === 'getIndexChange' && timeInterval && (
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    <strong>Interval:</strong> {timeInterval}s
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Event Time (Unix)"
                  size="small"
                  variant="outlined"
                  value={editableEventTime}
                  onChange={(e) => setEditableEventTime(e.target.value)}
                  fullWidth
                />
                {editableMode === 'getIndex' && (
                  <TextField
                    label="Base Time (Unix)"
                    size="small"
                    variant="outlined"
                    value={editableBaseTime}
                    onChange={(e) => setEditableBaseTime(e.target.value)}
                    fullWidth
                  />
                )}
                {editableMode === 'getIndexChange' && (
                  <TextField
                    label="Time Interval (s)"
                    size="small"
                    variant="outlined"
                    value={editableTimeInterval}
                    onChange={(e) => setEditableTimeInterval(e.target.value)}
                    fullWidth
                  />
                )}
                <Button variant="contained" onClick={handleUpdateParams} size="small">
                  Refetch
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
        <Box sx={{ flex: 1 }}>
          <ExplorePointView
            streamId={streamId}
            dataProvider={dataProvider}
            eventTime={Number(eventTime)}
            mode={mode}
            baseTime={baseTime ? Number(baseTime) : undefined}
            timeInterval={timeInterval ? Number(timeInterval) : undefined}
            onBack={() => navigate(-1)}
          />
        </Box>
      </Box>
    );
  };

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          TRUF.Network Values Explorer
        </Typography>
        <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 4 }}>
          Debug and explore Truf Network streams and their compositions
        </Typography>
        <Routes>
          <Route path="/" element={<QueryView />} />
          <Route path="/explore/:dataProvider/:streamId" element={<ExploreView />} />
        </Routes>
      </Container>
    </ThemeProvider>
  );
}

export default App;
