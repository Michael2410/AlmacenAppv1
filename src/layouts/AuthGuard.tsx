import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useTokenStore } from '../lib/api';
import { useEffect } from 'react';

export default function AuthGuard({ children }: PropsWithChildren) {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const setApiToken = useTokenStore(s => s.setToken);
  
  // Sincronizar tokens al montar
  useEffect(() => {
    if (token) {
      setApiToken(token);
    } else {
      const localToken = localStorage.getItem('token');
      if (localToken && !user) {
        localStorage.removeItem('token');
      }
    }
  }, [user, token, setApiToken]);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}
