import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useTokenStore } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const LogoutPage: React.FC = () => {
  const logout = useAuthStore(s => s.logout);
  const setApiToken = useTokenStore(s => s.setToken);
  const navigate = useNavigate();

  useEffect(() => {
    // Limpiar todo el estado de autenticación
    logout();
    setApiToken(null);
    localStorage.removeItem('token');
    
    console.log('Logout completado');
    
    // Redirigir al login directo después de limpiar
    setTimeout(() => {
      navigate('/direct-login');
    }, 1000);
  }, [logout, setApiToken, navigate]);

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h1>🚪 Cerrando sesión...</h1>
      <p>Limpiando estado de autenticación...</p>
    </div>
  );
};

export default LogoutPage;
