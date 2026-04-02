import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './src/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  const errorOverlay = document.getElementById('boot-error');
  if (errorOverlay) errorOverlay.style.display = 'flex';
  throw new Error("Could not find root element to mount to");
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (err: any) {
  console.error("Hydration failed:", err);
  const errorOverlay = document.getElementById('boot-error');
  const errorMsg = document.getElementById('error-message');
  if (errorOverlay && errorMsg) {
    errorOverlay.style.display = 'flex';
    errorMsg.innerText = "Application Hydration Error: " + (err.message || "Unknown Failure");
  }
}
