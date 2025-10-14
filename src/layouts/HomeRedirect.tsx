import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function HomeRedirect() {
  const navigate = useNavigate();
  const hasPermission = useAuthStore(s => s.hasPermission);
  const roleId = useAuthStore(s => s.user?.roleId);
  
  useEffect(() => {
    // Check if user has admin permissions (can view dashboard)
    const canViewDashboard = hasPermission(['inventory.viewAll']) || hasPermission(['users.manage']);
    
    if (canViewDashboard) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/inventario', { replace: true });
    }
  }, [roleId, navigate, hasPermission]);
  
  return null;
}
