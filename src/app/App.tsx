import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Config, DAppProvider, Gnosis, MetamaskConnector } from '@usedapp/core';

import BaseRouter from '../routes';

import { ErrorBoundary } from './Error/ErrorBoundary';
import { ErrorProvider } from './Error/ErrorContext';
import { MainLayout } from './layout/MainLayout';
import { ModalProvider } from './Modal/ModalProvider';

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
  <StrictMode>
    <ErrorProvider>
      <ErrorBoundary>
        <DAppProvider config={config}>
          <HashRouter basename="/">
            <ModalProvider>
              <MainLayout>
                <BaseRouter />
              </MainLayout>
            </ModalProvider>
          </HashRouter>
        </DAppProvider>
      </ErrorBoundary>
    </ErrorProvider>
  </StrictMode>,
);
