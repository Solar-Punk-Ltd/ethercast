import { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Home } from './pages/Home';
import { Stream } from './pages/Stream';

export enum ROUTES {
  HOME = '/',
  STREAM = '/stream',
}

const BaseRouter = (): ReactElement => {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Home />} />
      <Route path={ROUTES.STREAM} element={<Stream />} />
    </Routes>
  );
};

export default BaseRouter;
