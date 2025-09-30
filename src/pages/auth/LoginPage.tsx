import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useAuthStore } from '../../store/auth.store';
import { PREDEFINED_ROLES } from '../../types/seguridad';
import { useNavigate } from 'react-router-dom';
import { useTokenStore, loginAndSetToken } from '../../lib/api';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();
  const setToken = useTokenStore(s => s.setToken);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const onFinish = async (v: any) => {
    setLoading(true);
    try {
  const useMocks = (import.meta as any).env?.VITE_USE_MOCKS === 'true';
  if (useMocks) {
        const user = { id: 'u1', nombres: 'Usuario Demo', email: v.email, roleId: PREDEFINED_ROLES.ENCARGADO_ALMACEN.id };
        const token = 'demo-token';
        const roles = Object.values(PREDEFINED_ROLES);
        login(user as any, token, roles);
        setToken(token);
      } else {
        const { token, user, roles } = await loginAndSetToken(v.email, v.password);
        if (!token) throw new Error('Token no recibido');
        login(user as any, token, roles?.length ? roles : Object.values(PREDEFINED_ROLES));
      }
      message.success('Bienvenido');
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      const status = e?.response?.status;
      const apiMsg = e?.response?.data?.message || e?.message;
  if (status === 401) message.error('Credenciales erroneas');
      else message.error(apiMsg || 'No se pudo iniciar sesión');
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Typography.Title level={3} style={{ marginTop: 0 }}>Iniciar sesión</Typography.Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="tu@correo.com" />
          </Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>Entrar</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
