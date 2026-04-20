import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AIChatWidget } from './AIChat';
import type { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: LayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: '#080810' }}>
      {/* Ambient blob decorations — fixed, behind everything */}
      {/* Blob 1: top-right indigo */}
      <div
        style={{
          position: 'fixed',
          top: '-120px',
          right: '-80px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Blob 2: bottom-left purple */}
      <div
        style={{
          position: 'fixed',
          bottom: '-150px',
          left: '200px',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Blob 3: center-right subtle indigo */}
      <div
        style={{
          position: 'fixed',
          top: '40%',
          right: '10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Sidebar */}
      <Sidebar
        user={user}
        onLogout={onLogout}
        onOpenChat={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Main content — offset for floating sidebar (248px + 12px margin + 12px gap = 272px) */}
      <div style={{ marginLeft: '272px', position: 'relative', zIndex: 1 }}>
        <Topbar user={user} />
        <main>
          <Outlet />
        </main>
      </div>

      {/* AI Chat */}
      <AIChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
