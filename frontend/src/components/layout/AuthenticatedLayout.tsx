import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ProtectedRoute } from '../auth/ProtectedRoute';

export const AuthenticatedLayout: React.FC = () => {
  const location = useLocation();

  // Certain routes allow guest demo exploration (read-only views)
  const isDemoPermittedRoute =
    location.pathname === '/dashboard' ||
    location.pathname === '/receipts' ||
    location.pathname === '/analysis' ||
    location.pathname === '/ask-shopledger' ||
    location.pathname === '/suppliers' ||
    location.pathname.startsWith('/suppliers/') ||
    location.pathname === '/catalog' ||
    location.pathname.startsWith('/items/') ||
    location.pathname.startsWith('/receipts/') && !location.pathname.includes('/review') && !location.pathname.includes('/new') && !location.pathname.includes('/upload') ||
    location.pathname === '/help' ||
    location.pathname === '/design-system';

  return (
    <ProtectedRoute allowGuest={isDemoPermittedRoute}>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  );
};
