import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { HashRouter } from 'react-router-dom';
import { Config, DAppProvider, Gnosis, MetamaskConnector } from '@usedapp/core';

import { ErrorFallback } from '../components/ErrorFallback/ErrorFallback';
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
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DAppProvider config={config}>
        <HashRouter basename="/">
          <MainLayout>
            <BaseRouter />
          </MainLayout>
        </HashRouter>
      </DAppProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
