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
        const user = { id: 'u1', nombres: 'Usuario Demo', email: v.email, roleId: PREDEFINED_ROLES.ADMIN.id };
        const token = 'demo-token';
        const roles = Object.values(PREDEFINED_ROLES);
        login(user as any, token, roles);
        setToken(token);
      } else {
        const { token, user, roles } = await loginAndSetToken(v.email, v.password);
        if (!token) throw new Error('Token no recibido');
        login(user as any, token, roles?.length ? roles : Object.values(PREDEFINED_ROLES));
        setToken(token); // Asegurar que el token store también se actualice
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
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-slate-100 to-slate-200 p-6">
    <Card
      className="w-full max-w-md shadow-2xl rounded-2xl border border-gray-100 backdrop-blur-sm"
      style={{
        background: "rgba(255,255,255,0.9)",
        padding: "2.5rem",
      }}
    >
      <div className="text-center mb-6">
        <Typography.Title
          level={3}
          style={{
            marginTop: 0,
            marginBottom: "0.5rem",
            fontWeight: 700,
          }}
        >
          Iniciar sesión
        </Typography.Title>
        <Typography.Text type="secondary">
          Ingresa tus credenciales para continuar
        </Typography.Text>
      </div>

      <Form
        layout="vertical"
        onFinish={onFinish}
        className="space-y-4"
        size="large"
      >
        <Form.Item
          name="email"
          label="Correo electrónico"
          rules={[
            { required: true, type: "email", message: "Ingresa un correo válido" },
          ]}
        >
          <Input
            placeholder="tu@correo.com"
            className="rounded-lg"
            prefix={<i className="ri-mail-line text-gray-400 mr-1" />}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Contraseña"
          rules={[{ required: true, message: "Ingresa tu contraseña" }]}
        >
          <Input.Password
            placeholder="••••••••"
            className="rounded-lg"
            prefix={<i className="ri-lock-line text-gray-400 mr-1" />}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            className="rounded-lg font-semibold h-11 text-base"
          >
            Entrar
          </Button>
        </Form.Item>
      </Form>
    </Card>
  </div>
);


}
