import React, { useState } from 'react';

import { Sidebar } from './Sidebar/Sidebar';
import { Footer } from './Footer';
import { Header } from './Header';

import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prop) => !prop);
  };

  return (
    <>
      <div className="layout">
        {isSidebarOpen && <div className="overlay" onClick={toggleSidebar} />}
        <Header openSidebar={toggleSidebar} />
        <Sidebar open={isSidebarOpen} />
        <main>{children}</main>
        <Footer />
      </div>
    </>
  );
}
