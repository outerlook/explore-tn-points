import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { BrowserTNClient } from '@trufnetwork/sdk-js';
import { Wallet } from 'ethers';

// Type for the context value, including the client and a function to connect
interface TNClientContextType {
  client: BrowserTNClient | null;
  connect: (privateKey: string, endpoint: string, chainId: string) => void;
  isConnected: boolean;
  connectionError: string | null;
}

const TNClientContext = createContext<TNClientContextType | null>(null);

export const useTNClient = () => {
  const context = useContext(TNClientContext);
  if (!context) throw new Error('useTNClient must be used within a TNClientProvider');
  return context;
};

interface ConnectionParams {
  privateKey: string;
  endpoint: string;
  chainId: string;
}

export const TNClientProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<BrowserTNClient | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [params, setParams] = useState<ConnectionParams | null>(null);

  const connect = useCallback(async (privateKey: string, endpoint: string, chainId: string) => {
    // Reuse existing client if connection parameters are unchanged
    if (
      isConnected &&
      client &&
      params?.privateKey === privateKey &&
      params?.endpoint === endpoint &&
      params?.chainId === chainId
    ) {
      console.log('Connection parameters unchanged. Reusing existing client.');
      return;
    }

    try {
      // Clear any previous error
      setConnectionError(null);

      const wallet = new Wallet(privateKey);
      const newClient = new BrowserTNClient({
        endpoint,
        signerInfo: { address: wallet.address, signer: wallet },
        chainId,
      });


      setClient(newClient);
      setParams({ privateKey, endpoint, chainId });
      setIsConnected(true);
      console.log('Authenticated and connected to TN Client:', { address: wallet.address, endpoint, chainId });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during connection.';
      console.error("Failed to connect:", e);
      setConnectionError(errorMessage);
      setClient(null);
      setParams(null);
      setIsConnected(false);
    }
  }, [client, isConnected, params]);

  return (
    <TNClientContext.Provider value={{ client, connect, isConnected, connectionError }}>
      {children}
    </TNClientContext.Provider>
  );
}; 