import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Config, DAppProvider, Gnosis, MetamaskConnector } from '@usedapp/core';

import BaseRouter from '../routes';

import { MainLayout } from './layout/MainLayout';

import './App.scss';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const config: Config = {
  networks: [Gnosis],
  readOnlyChainId: Gnosis.chainId,
  connectors: {
    metamask: new MetamaskConnector(),
  },
  pollingInterval: 5000,
};

root.render(
  <React.StrictMode>
    <DAppProvider config={config}>
      <HashRouter basename="/">
        <MainLayout>
          <BaseRouter />
        </MainLayout>
      </HashRouter>
    </DAppProvider>
  </React.StrictMode>,
);
