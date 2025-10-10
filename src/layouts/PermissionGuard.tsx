import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import type { Permission } from '../types/seguridad';
import { useAuthStore } from '../store/auth.store';

export function PermissionGuard({ require, children }: PropsWithChildren<{ require: Permission | Permission[] }>) {
  const has = useAuthStore(s => s.hasPermission);
  const user = useAuthStore(s => s.user);
  
  console.log('PermissionGuard evaluando:', {
    require,
    user: user?.email,
    roleId: user?.roleId,
    hasPermission: has(require)
  });
  
  if (!user) {
    console.log('PermissionGuard: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (!has(require)) {
    console.log('PermissionGuard: No permission, redirecting to 403');
    return <Navigate to="/403" replace />;
  }
  
  console.log('PermissionGuard: Permission granted, rendering children');
  return <>{children}</>;
}

export default PermissionGuard;
