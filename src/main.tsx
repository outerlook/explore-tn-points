import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { TNClientProvider } from './contexts/TNClientProvider'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TNClientProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TNClientProvider>
    </QueryClientProvider>
  </StrictMode>,
)
