import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './app.routes.jsx';
import useAuth from '../features/auth/hook/useAuth.js';

function App() {
  const { fetchCurrentUser } = useAuth();

  useEffect(() => {
    // Validate httpOnly session cookie with backend on app launch
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return <RouterProvider router={router} />;
}

export default App;
