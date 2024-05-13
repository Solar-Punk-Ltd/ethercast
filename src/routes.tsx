import { ReactElement, createContext, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Home } from './pages/Home/Home';
import { Stream } from './pages/Stream/Stream';

export enum ROUTES {
  HOME = '/',
  STREAM = '/stream',
}
export const MainContext = createContext({
  nickNames: {} as { [key: string]: { [key: string]: string } },
  setNickNames: (_: any) => {},
  actualAccount: '',
  setActualAccount: (_: any) => {},
  actualTopic: '',
  setActualTopic: (_: any) => {},
});

const BaseRouter = (): ReactElement => {
  const [nickNames, setNickNames] = useState<{ [key: string]: { [key: string]: string } }>({});
  const [actualAccount, setActualAccount] = useState('');
  const [actualTopic, setActualTopic] = useState('');
  return (
    <MainContext.Provider
      value={{
        nickNames: nickNames,
        setNickNames: setNickNames,
        actualAccount,
        setActualAccount,
        actualTopic,
        setActualTopic,
      }}
    >
      <Routes>
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.STREAM} element={<Stream />} />
      </Routes>
    </MainContext.Provider>
  );
};

export default BaseRouter;
