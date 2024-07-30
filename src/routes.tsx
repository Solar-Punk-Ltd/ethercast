import { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Home } from './pages/Home/Home';
import { Search } from './pages/Search/Search';
import { Stream } from './pages/Stream/Stream';
import { Watch } from './pages/Watch/Watch';

export enum ROUTES {
  HOME = '/',
  SEARCH = '/search',
  WATCH = '/watch',
  STREAM = '/stream',
}

const BaseRouter = (): ReactElement => {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Home />} />
      <Route path={ROUTES.SEARCH} element={<Search />} />
      <Route path={ROUTES.STREAM} element={<Stream />} />
      <Route path={ROUTES.WATCH} element={<Watch />} />
    </Routes>
  );
};

export default BaseRouter;
