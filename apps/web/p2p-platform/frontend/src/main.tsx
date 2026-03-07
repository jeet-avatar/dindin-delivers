import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { StyleProvider } from '@ant-design/cssinjs';
import App from './App.tsx';
import './index.css';
import { UserProvider } from './app/context/UserContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <UserProvider>
          <App />
        </UserProvider>
      </BrowserRouter>
    </StyleProvider>
  </StrictMode>
);