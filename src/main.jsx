import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { migrateAvailability } from './utils/migrateAvailability.js';

// Expose migration function to console for manual trigger
if (typeof window !== 'undefined') {
  window.migrateAvailability = migrateAvailability;
}

// Rendering the application
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);