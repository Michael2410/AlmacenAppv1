import { Button, Flex, Typography } from 'antd';
import { useAuthStore } from '../store/auth.store';
import { useNavigate } from 'react-router-dom';
import { useTokenStore } from '../lib/api';

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const setToken = useTokenStore(s => s.setToken);
  const navigate = useNavigate();
  
  const handleLogout = () => {
    console.log('🚪 Cerrando sesión...');
    logout();
    setToken(null);
    navigate('/login', { replace: true });
  };
  
  return (
    <Flex align="center" justify="space-between" className="h-full">
      <Typography.Title level={4} style={{ margin: 0 }}>Almacén</Typography.Title>
      {user ? (
        <Flex gap={8} align="center">
          <span>{user.nombres}</span>
          <Button onClick={handleLogout}>Salir</Button>
        </Flex>
      ) : (
        <Button type="primary" onClick={() => navigate('/login')}>Iniciar sesión</Button>
      )}
    </Flex>
  );
}
