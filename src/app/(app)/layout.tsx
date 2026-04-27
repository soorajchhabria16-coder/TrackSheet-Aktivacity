'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { AuthProvider } from '@/lib/auth-context';

import { MobileNavProvider, useMobileNav } from '@/lib/mobile-nav-context';

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, closeSidebar } = useMobileNav();

  return (
    <div className={`app ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      <main className="main">
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MobileNavProvider>
        <LayoutInner>{children}</LayoutInner>
      </MobileNavProvider>
    </AuthProvider>
  );
}
