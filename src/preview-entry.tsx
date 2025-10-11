import React from 'react';
import ReactDOM from 'react-dom/client';
import { PreviewMain } from './modules/preview/preview-main';
import './index.css';

ReactDOM.createRoot(document.getElementById('preview-root')!).render(
  <React.StrictMode>
    <PreviewMain />
  </React.StrictMode>
);
