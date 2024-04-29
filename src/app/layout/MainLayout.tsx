import React, { useState } from 'react';

import { Sidebar } from './Sidebar/Sidebar';
import { Footer } from './Footer';
import { Header } from './Header';

import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}
// export const LayoutContext = React.createContext('auto');

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // const [chatBodyHeight, setChatBodyHeight] = useState('10px');

  const toggleSidebar = () => {
    setIsSidebarOpen((prop) => !prop);
  };

  return (
    <>
      {/* <LayoutContext.Provider value={chatBodyHeight}> */}
      <div className="layout">
        {isSidebarOpen && <div className="overlay" onClick={toggleSidebar} />}
        <Header openSidebar={toggleSidebar} />
        <Sidebar open={isSidebarOpen} />
        <main>{children}</main>
        <Footer />
      </div>
      {/* </LayoutContext.Provider> */}
    </>
  );
}
