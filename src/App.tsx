import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import { MainLayout } from './layout/MainLayout';
import BaseRouter from './routes';

import './App.scss';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <MainLayout>
      <HashRouter basename="/">
        <BaseRouter />
      </HashRouter>
    </MainLayout>
  </React.StrictMode>,
);
