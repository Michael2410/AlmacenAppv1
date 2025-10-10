import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useTokenStore } from '../../lib/api';

const AutoLoginWorkerPage: React.FC = () => {
  const [status, setStatus] = useState('Iniciando login automático...');
  const login = useAuthStore(s => s.login);
  const setApiToken = useTokenStore(s => s.setToken);
  const navigate = useNavigate();

  useEffect(() => {
    const doAutoLogin = async () => {
      try {
        setStatus('Obteniendo datos de login...');
        
        // Primero limpiar estado anterior
        localStorage.removeItem('token');
        
        const response = await fetch('/api/debug/auto-login/trabajador');
        const data = await response.json();
        
        console.log('Response de auto-login:', data);
        
        if (data.success) {
          setStatus('Configurando autenticación...');
          
          // Configurar localStorage primero
          localStorage.setItem('token', data.data.token);
          
          // Configurar API token
          setApiToken(data.data.token);
          
          // Configurar auth store
          login(data.data.user, data.data.token, data.data.roles);
          
          setStatus('Login exitoso! Verificando estado...');
          
          // Verificar que todo se guardó correctamente
          console.log('Usuario en store:', data.data.user);
          console.log('Roles en store:', data.data.roles);
          console.log('Token en localStorage:', localStorage.getItem('token'));
          
          message.success(`Login exitoso como ${data.data.user.email}`);
          
          // Esperar un momento y redirigir
          setTimeout(() => {
            setStatus('Redirigiendo a pedidos...');
            navigate('/pedidos/mios');
          }, 2000);
          
        } else {
          setStatus(`Error: ${data.message}`);
          message.error(data.message);
        }
      } catch (error) {
        setStatus(`Error de conexión: ${error}`);
        message.error('Error en login automático');
        console.error('Error en auto-login:', error);
      }
    };

    doAutoLogin();
  }, [login, setApiToken, navigate]);

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h1>🔄 Login Automático</h1>
      <p>{status}</p>
    </div>
  );
};

export default AutoLoginWorkerPage;
