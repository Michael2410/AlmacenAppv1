import React from 'react';
import { Button, message } from 'antd';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';

const DebugLoginPage: React.FC = () => {
  const login = useAuthStore(s => s.login);
  const logout = useAuthStore(s => s.logout);
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const handleAutoLogin = async (role: 'admin' | 'trabajador') => {
    try {
      const response = await fetch(`/api/debug/auto-login/${role}`);
      const data = await response.json();
      
      if (data.success) {
        login(data.data.user, data.data.token, data.data.roles);
        localStorage.setItem('token', data.data.token);
        message.success(`Login como ${role} exitoso`);
        
        // Redirigir según el rol
        if (role === 'admin') {
          navigate('/dashboard');
        } else {
          navigate('/pedidos/mios');
        }
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error('Error en login automático');
      console.error(error);
    }
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    message.success('Logout exitoso');
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Debug Login</h1>
      
      {user ? (
        <div>
          <p>Usuario actual: {user.email}</p>
          <p>Rol: {user.roleId}</p>
          <Button onClick={handleLogout} type="default">
            Logout
          </Button>
        </div>
      ) : (
        <p>No hay usuario logueado</p>
      )}
      
      <div style={{ marginTop: 20 }}>
        <Button 
          onClick={() => handleAutoLogin('admin')} 
          type="primary" 
          style={{ marginRight: 10 }}
        >
          Login como Admin
        </Button>
        <Button 
          onClick={() => handleAutoLogin('trabajador')} 
          type="primary"
        >
          Login como Trabajador
        </Button>
      </div>
      
      <div style={{ marginTop: 20 }}>
        <Button onClick={() => navigate('/pedidos/mios')}>
          Ir a Pedidos
        </Button>
        <Button onClick={() => navigate('/test')} style={{ marginLeft: 10 }}>
          Ir a Test
        </Button>
      </div>
    </div>
  );
};

export default DebugLoginPage;
