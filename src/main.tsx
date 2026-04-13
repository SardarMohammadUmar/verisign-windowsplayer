import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyBrandingToDocument, getBranding } from './services/branding';

applyBrandingToDocument(getBranding());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

