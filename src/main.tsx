import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker for offline resilience & background caching
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[AURA PWA] New version available.');
  },
  onOfflineReady() {
    console.log('[AURA PWA] App ready for offline usage.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
