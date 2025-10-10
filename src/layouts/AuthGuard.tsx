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
    console.log('AuthGuard inicializando - usuario:', user?.email, 'token auth store:', !!token);
    
    const localToken = localStorage.getItem('token');
    console.log('Token en localStorage:', !!localToken);
    
    if (token) {
      // Si hay token en auth store, asegurar que esté en api store
      setApiToken(token);
      console.log('Token sincronizado al API store');
    } else if (localToken && !user) {
      // Si hay token en localStorage pero no en auth store, algo está mal
      console.log('Token en localStorage pero no en auth store - limpiando');
      localStorage.removeItem('token');
    }
  }, [user, token, setApiToken]);
  
  if (!user) {
    console.log('AuthGuard: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}
