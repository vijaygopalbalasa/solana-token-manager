import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import './polyfills';
import ErrorBoundary from './ErrorBoundary';

function renderApp() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    try {
      const root = createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </React.StrictMode>
      );
    } catch (error) {
      console.error('Error rendering the app:', error);
    }
  } else {
    console.error('Root element not found');
  }
}

// Ensure the DOM is fully loaded before rendering
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}