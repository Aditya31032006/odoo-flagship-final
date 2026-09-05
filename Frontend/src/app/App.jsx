import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './app.routes.jsx';
import useAuth from '../features/auth/hook/useAuth.js';
import { ToastProvider } from '../shared/context/ToastContext.jsx';
import ToastContainer from '../shared/components/ToastContainer.jsx';
import ConfirmModal from '../shared/components/ConfirmModal.jsx';

function App() {
  const { fetchCurrentUser } = useAuth();

  useEffect(() => {
    fetchCurrentUser();

    // Auto-resync permissions and fresh token when user focuses/returns to tab
    const handleFocus = () => {
      fetchCurrentUser();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchCurrentUser]);

  return (
    <ToastProvider>
      <RouterProvider router={router} />
      <ToastContainer />
      <ConfirmModal />
    </ToastProvider>
  );
}

export default App;

