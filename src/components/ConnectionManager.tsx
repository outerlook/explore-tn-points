import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Chip,
  Alert,
} from '@mui/material';
import { useTNClient } from '../contexts/TNClientProvider';

const DEFAULT_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001';
const DEFAULT_PROVIDER = 'http://localhost:5174/api';
const DEFAULT_CHAIN_ID = 'tn-v2';

export const ConnectionManager = () => {
  const { connect, isConnected, connectionError } = useTNClient();
  const [privateKey, setPrivateKey] = useState(DEFAULT_PRIVATE_KEY);
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [chainId, setChainId] = useState(DEFAULT_CHAIN_ID);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedPrivateKey = localStorage.getItem('tn-private-key');
    const savedProvider = localStorage.getItem('tn-provider');
    const savedChainId = localStorage.getItem('tn-chain-id');

    if (savedPrivateKey) setPrivateKey(savedPrivateKey);
    if (savedProvider) setProvider(savedProvider);
    if (savedChainId) setChainId(savedChainId);

    // Auto-connect if we have saved settings
    if (savedPrivateKey && savedProvider && savedChainId) {
      connect(savedPrivateKey, savedProvider, savedChainId);
    }
  }, [connect]);

  const handleConnect = () => {
    // Save settings to localStorage
    localStorage.setItem('tn-private-key', privateKey);
    localStorage.setItem('tn-provider', provider);
    localStorage.setItem('tn-chain-id', chainId);

    // Connect to the client
    connect(privateKey, provider, chainId);
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Connection Settings
          </Typography>
          <Chip
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            size="small"
          />
        </Box>

        {connectionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {connectionError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Private Key"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            type="password"
            size="small"
            fullWidth
            helperText="Your private key for signing transactions"
          />

          <TextField
            label="Provider URL"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            size="small"
            fullWidth
            helperText="The TSN network endpoint"
          />

          <TextField
            label="Chain ID"
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
            size="small"
            fullWidth
            helperText="The network chain identifier"
          />

          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={!privateKey || !provider || !chainId}
            size="small"
          >
            {isConnected ? 'Reconnect' : 'Connect'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}; 