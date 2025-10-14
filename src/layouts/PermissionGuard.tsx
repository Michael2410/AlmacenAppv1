import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import type { Permission } from '../types/seguridad';
import { useAuthStore } from '../store/auth.store';

export function PermissionGuard({ require, children }: PropsWithChildren<{ require: Permission | Permission[] }>) {
  const has = useAuthStore(s => s.hasPermission);
  const user = useAuthStore(s => s.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!has(require)) {
    return <Navigate to="/403" replace />;
  }
  
  return <>{children}</>;
}

export default PermissionGuard;
