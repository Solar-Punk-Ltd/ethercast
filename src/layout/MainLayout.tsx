import { useState } from 'react';

import { Footer } from './Footer';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="layout">
      <Header openSidebar={() => setIsSidebarOpen((prop) => !prop)} />
      <Sidebar open={isSidebarOpen} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
