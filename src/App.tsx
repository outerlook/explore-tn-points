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
  IconButton,
  Menu,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { Routes, Route, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { ConnectionManager } from './components/ConnectionManager';
import { QueryForm } from './components/QueryForm';
import { ResultsTable } from './components/ResultsTable';
import { ExplorePointView } from './components/ExplorePointView';
import { TimelineContainer } from './components/TimelineContainer';
import type { QueryParams, QueryMode } from './components/QueryForm';
import { useStreamQuery } from './hooks/useStreamQuery';
import { useStreamExplorer } from './hooks/useStreamExplorer';
import { StreamId, EthereumAddress } from '@trufnetwork/sdk-js';
import { type StreamLocator } from '@trufnetwork/sdk-js';

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
    const maxDepth = searchParams.get('maxDepth') ? Number(searchParams.get('maxDepth')) : 2;

    const [view, setView] = useState<'graph' | 'timeline'>('graph');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const [editableMode, setEditableMode] = useState(mode);
    const [editableEventTime, setEditableEventTime] = useState(eventTime || '');
    const [editableBaseTime, setEditableBaseTime] = useState(baseTime || '');
    const [editableTimeInterval, setEditableTimeInterval] = useState(timeInterval || '');
    const [editableMaxDepth, setEditableMaxDepth] = useState(String(maxDepth));

    const [streamLocator, setStreamLocator] = useState<StreamLocator | null>(null);

    useEffect(() => {
        const initLocator = async () => {
            if (!streamId || !dataProvider) return;
            try {
                const id = StreamId.fromString(streamId).getRight();
                if (!id) {
                    throw new Error('Invalid stream ID');
                }
                const provider = new EthereumAddress(dataProvider);
                setStreamLocator({ streamId: id, dataProvider: provider });
            } catch (e) {
                console.error(e)
            }
        }
        initLocator();
    }, [streamId, dataProvider]);

    const {
        nodes,
        edges,
        timelineData,
        isLoading,
        error,
        processedCount,
        totalDiscovered,
        loadingStatus
    } = useStreamExplorer({
        streamLocator,
        targetTime: Number(eventTime),
        level: maxDepth,
        mode: mode as QueryMode,
        baseTime: baseTime ? Number(baseTime) : undefined,
        timeInterval: timeInterval ? Number(timeInterval) : undefined,
    });

    useEffect(() => {
      setEditableMode(mode);
      setEditableEventTime(eventTime || '');
      setEditableBaseTime(baseTime || '');
      setEditableTimeInterval(timeInterval || '');
      setEditableMaxDepth(String(maxDepth));
    }, [mode, eventTime, baseTime, timeInterval, maxDepth]);

    const handleUpdateParams = () => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('eventTime', editableEventTime);
      newSearchParams.set('mode', editableMode as string);
      newSearchParams.set('maxDepth', editableMaxDepth);

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
  
    const handleBackToQuery = () => {
      navigate(`/?${searchParams.toString()}`);
    }

    if (!dataProvider || !streamId || !eventTime || !mode) {
      return <Alert severity="error">Missing required parameters for exploration.</Alert>;
    }
  
    return (
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box sx={{ flex: { xs: 1, md: '0 0 400px' } }}>
          <Paper sx={{ p: 2, height: 'fit-content' }}>
            <ConnectionManager />
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Exploring Stream</Typography>
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                  <SettingsIcon />
                </IconButton>
              </Box>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
                  <Typography variant="subtitle2">View Options</Typography>
                  <RadioGroup row value={view} onChange={(e) => setView(e.target.value as 'graph' | 'timeline')}>
                    <FormControlLabel value="graph" control={<Radio />} label="Graph View" />
                    <FormControlLabel value="timeline" control={<Radio />} label="Timeline View" />
                  </RadioGroup>

                  <Typography variant="subtitle2" sx={{ mt: 1 }}>Query Parameters</Typography>
                  <TextField
                    label="Event Time"
                    value={editableEventTime}
                    onChange={(e) => setEditableEventTime(e.target.value)}
                    size="small"
                    fullWidth
                    type="number"
                  />
                  <FormControl size="small" fullWidth>
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
                  
                  {editableMode === 'getIndex' && (
                    <TextField
                      label="Base Time"
                      value={editableBaseTime}
                      onChange={(e) => setEditableBaseTime(e.target.value)}
                      size="small"
                      fullWidth
                      type="number"
                    />
                  )}
                  {editableMode === 'getIndexChange' && (
                    <TextField
                      label="Time Interval (seconds)"
                      value={editableTimeInterval}
                      onChange={(e) => setEditableTimeInterval(e.target.value)}
                      size="small"
                      fullWidth
                      type="number"
                    />
                  )}

                  <TextField
                    label="Max Depth"
                    type="number"
                    value={editableMaxDepth}
                    onChange={(e) => setEditableMaxDepth(e.target.value)}
                    size="small"
                    fullWidth
                    InputProps={{ inputProps: { min: 0, max: 10 } }}
                    helperText="How many levels of child streams to explore."
                  />

                  <Button onClick={handleUpdateParams} variant="contained" size="small">Update</Button>
                </Box>
              </Menu>
            </Box>
          </Paper>
        </Box>
        <Box sx={{ flex: 1 }}>
          {isLoading ? (
            <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              <CircularProgress />
              <Typography variant="h6" sx={{ mt: 2 }}>
                {loadingStatus === 'traversing' ? 'Discovering Stream Composition...' : 'Fetching Timeline Data...'}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                {loadingStatus === 'traversing'
                  ? `${processedCount} streams found so far.`
                  : `${totalDiscovered} streams found. Now fetching records.`}
              </Typography>
            </Paper>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          ) : (
            <>
              {view === 'graph' && (
                <ExplorePointView
                  nodes={nodes}
                  edges={edges}
                  onBack={handleBackToQuery}
                />
              )}
              {view === 'timeline' && (
                <TimelineContainer data={timelineData} targetTime={Number(eventTime)} />
              )}
            </>
          )}
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
