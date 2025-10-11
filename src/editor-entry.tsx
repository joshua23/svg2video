import React from 'react';
import ReactDOM from 'react-dom/client';
import { EditorMain } from './modules/editor/editor-main';
import './index.css';

ReactDOM.createRoot(document.getElementById('editor-root')!).render(
  <React.StrictMode>
    <EditorMain />
  </React.StrictMode>
);
