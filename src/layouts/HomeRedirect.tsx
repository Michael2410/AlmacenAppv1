import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function HomeRedirect() {
  const navigate = useNavigate();
  const roleId = useAuthStore(s => s.user?.roleId);
  useEffect(() => {
    if (roleId === 'role-encargado') navigate('/dashboard', { replace: true });
    else navigate('/inventario/mio', { replace: true });
  }, [roleId, navigate]);
  return null;
}
