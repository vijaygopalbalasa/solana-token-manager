import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import './polyfills';
import ErrorBoundary from './ErrorBoundary';

const root = createRoot(document.getElementById('root'));

try {
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