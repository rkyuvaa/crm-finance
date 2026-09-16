import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logout, isSessionExpired } from '@/auth/authSlice';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAppSelector((state) => state.auth.token);
  const dispatch = useAppDispatch();
  const location = useLocation();

  useEffect(() => {
    const checkSession = () => {
      if (isSessionExpired()) {
        dispatch(logout());
      }
    };

    checkSession();
    // Check every minute if session has exceeded 10 hours while tab is open
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

  if (!token || isSessionExpired()) {
    return <Navigate to="/login" state={{ from: location, sessionExpired: true }} replace />;
  }
  return <>{children}</>;
}
