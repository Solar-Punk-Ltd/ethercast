import { ReactElement, createContext, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Home } from './pages/Home/Home';
import { Stream } from './pages/Stream/Stream';

export enum ROUTES {
  HOME = '/',
  STREAM = '/stream',
}
export const MainContext = createContext({ mainNickName: '', setMainNickName: (_: string) => {} });

const BaseRouter = (): ReactElement => {
  const [mainNickName, setMainNickName] = useState<string>('');
  return (
    <MainContext.Provider value={{ mainNickName: mainNickName, setMainNickName: setMainNickName }}>
      <Routes>
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.STREAM} element={<Stream />} />
      </Routes>
    </MainContext.Provider>
  );
};

export default BaseRouter;
