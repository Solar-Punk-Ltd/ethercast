import { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';

import Home from './pages/Home';

export enum ROUTES {
  HOME = '/',
  STREAM = '/stream',
}

const BaseRouter = (): ReactElement => {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Home />} />
      <Route path={ROUTES.STREAM} element={<Home />} />
    </Routes>
  );
};

export default BaseRouter;
