import React from 'react';
import RoutesApp from './routes';
import { useAnalytics } from './hooks/useAnalytics';

export default function App() {
  useAnalytics();
  return <RoutesApp />;
}
