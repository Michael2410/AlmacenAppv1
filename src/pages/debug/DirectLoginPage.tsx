import React, { useState, useEffect } from 'react';
import { Button, Input, message, Card } from 'antd';
import { useAuthStore } from '../../store/auth.store';
import { useTokenStore } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const DirectLoginPage: React.FC = () => {
  const [email, setEmail] = useState('user2@demo.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  
  const login = useAuthStore(s => s.login);
  const setApiToken = useTokenStore(s => s.setToken);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      console.log('Iniciando login con:', { email, password });
      
      // Hacer login en el servidor
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Response del login:', data);

      if (data.success) {
        console.log('Login exitoso, configurando stores...');
        
        // Limpiar estado anterior
        localStorage.removeItem('token');
        
        // Configurar localStorage
        localStorage.setItem('token', data.data.token);
        console.log('Token guardado en localStorage');
        
        // Configurar API token
        setApiToken(data.data.token);
        console.log('Token configurado en API store');
        
        // Configurar auth store
        login(data.data.user, data.data.token, data.data.roles);
        console.log('Usuario configurado en auth store:', data.data.user);
        
        message.success(`Bienvenido ${data.data.user.nombres}`);
        
        // Redirigir después de un momento
        setTimeout(() => {
          navigate('/pedidos/mios');
        }, 1500);
        
      } else {
        message.error(data.message || 'Error en login');
      }
    } catch (error) {
      console.error('Error en login:', error);
      message.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Auto login cuando se monta el componente
  useEffect(() => {
    if (!autoLogin) {
      setAutoLogin(true);
      setTimeout(() => {
        handleLogin();
      }, 1000);
    }
  }, [autoLogin]);

  return (
    <div style={{ padding: 24, maxWidth: 400, margin: '0 auto' }}>
      <Card title="🔑 Login Directo">
        <div style={{ marginBottom: 16 }}>
          <label>Email:</label>
          <Input 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label>Password:</label>
          <Input.Password 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>
        
        <Button 
          type="primary" 
          onClick={handleLogin}
          loading={loading}
          block
        >
          Iniciar Sesión
        </Button>
        
        <div style={{ marginTop: 16, fontSize: 12 }}>
          <p>Credenciales por defecto:</p>
          <p>Email: user2@demo.com</p>
          <p>Password: admin123</p>
        </div>
      </Card>
    </div>
  );
};

export default DirectLoginPage;
