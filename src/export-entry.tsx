import React from 'react';
import ReactDOM from 'react-dom/client';
import { ExportMain } from './modules/export/export-main';
import './index.css';

ReactDOM.createRoot(document.getElementById('export-root')!).render(
  <React.StrictMode>
    <ExportMain />
  </React.StrictMode>
);
