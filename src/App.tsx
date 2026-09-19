import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, ThemeProvider, NotificationProvider } from '@/store';
import { AppRoutes } from '@/routes/AppRoutes';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
