import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function HomeRedirect() {
  const navigate = useNavigate();
  const hasPermission = useAuthStore(s => s.hasPermission);
  const roleId = useAuthStore(s => s.user?.roleId);
  
  console.log('HomeRedirect ejecutándose con roleId:', roleId);
  
  useEffect(() => {
    console.log('HomeRedirect useEffect - roleId:', roleId);
    // Check if user has admin permissions (can view dashboard)
    const canViewDashboard = hasPermission(['inventory.viewAll']) || hasPermission(['users.manage']);
    
    if (canViewDashboard) {
      console.log('Redirigiendo usuario con permisos administrativos a dashboard');
      navigate('/dashboard', { replace: true });
    } else {
      console.log('Redirigiendo usuario sin permisos administrativos a inventario');
      navigate('/inventario', { replace: true });
    }
  }, [roleId, navigate, hasPermission]);
  
  return null;
}
