import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initBackendWarmup } from './services/backendWarmup';

// Instantly wake up Render backend as early as possible when bundle loads
initBackendWarmup();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
