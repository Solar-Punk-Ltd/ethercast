import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Config, DAppProvider, Gnosis, Mainnet } from '@usedapp/core';
import { getDefaultProvider } from 'ethers';

import { MainLayout } from './layout/MainLayout';
import BaseRouter from './routes';

import './App.scss';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const config: Config = {
  readOnlyChainId: Mainnet.chainId,
  readOnlyUrls: {
    [Mainnet.chainId]: getDefaultProvider('mainnet'),
    [Gnosis.chainId]: getDefaultProvider(),
  },
};

root.render(
  <React.StrictMode>
    <DAppProvider config={config}>
      <MainLayout>
        <HashRouter basename="/">
          <BaseRouter />
        </HashRouter>
      </MainLayout>
    </DAppProvider>
  </React.StrictMode>,
);
