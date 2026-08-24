import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import 'react-day-picker/style.css';

// Suppress ReferenceError for dragEvent if something tries to access it
if (typeof window !== 'undefined') {
  try {
    // Wrap in try-catch to prevent errors during initialization
    (window as any).dragEvent = undefined;
  } catch (_e) {
    // Ignore errors
  }

  // Suppress console warnings for React DevTools, Electron CSP, and React Router future flags
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (
      message.includes('Download the React DevTools') ||
      message.includes('reactjs.org/link/react-devtools') ||
      message.includes('Electron Security Warning') ||
      message.includes('Content-Security-Policy') ||
      message.includes('React Router Future Flag Warning') ||
      message.includes('v7_startTransition') ||
      message.includes('v7_relativeSplatPath')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
