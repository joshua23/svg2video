import React from 'react';
import ReactDOM from 'react-dom/client';
import { FilmMain } from './modules/film/film-main';
import './index.css';

ReactDOM.createRoot(document.getElementById('film-root')!).render(
  <React.StrictMode>
    <FilmMain />
  </React.StrictMode>
);
