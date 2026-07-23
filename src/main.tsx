import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { migrateWinampStorageKeys } from './utils/migrateStorage';

// Migrate legacy winamp_ localStorage keys to spinamp_ once on startup
migrateWinampStorageKeys();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
