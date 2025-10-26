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
        const user = {
          id: 'u1',
          nombres: 'Usuario Demo',
          email: v.email,
          roleId: PREDEFINED_ROLES.ADMIN.id
        };
        const token = 'demo-token';
        const roles = Object.values(PREDEFINED_ROLES);
        login(user as any, token, roles);
        setToken(token);
      } else {
        const { token, user, roles } = await loginAndSetToken(v.email, v.password);
        if (!token) throw new Error('Token no recibido');
        login(
          user as any,
          token,
          roles?.length ? roles : Object.values(PREDEFINED_ROLES)
        );
        setToken(token);
      }
      message.success('Bienvenido');
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      const status = e?.response?.status;
      const apiMsg = e?.response?.data?.message || e?.message;
      if (status === 401) message.error('Credenciales incorrectas');
      else message.error(apiMsg || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-100 to-blue-300 relative overflow-hidden">

      {/* Elementos decorativos */}
      <div className="absolute top-10 left-20 w-36 h-36 rounded-full bg-blue-500 blur-3xl opacity-20 animate-float-slow"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 rounded-full bg-indigo-600 blur-3xl opacity-20 animate-float"></div>

      <Card
        className="w-full max-w-md shadow-xl rounded-2xl border-0 backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.85)",
          padding: "3rem",
        }}
      >
        <div className="text-center mb-8">
          <Typography.Title
            level={2}
            style={{
              marginTop: 0,
              marginBottom: "0.5rem",
              fontWeight: 800,
              color: "#1e293b"
            }}
          >
            Bienvenido
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: "0.95rem" }}>
            Accede al sistema para continuar
          </Typography.Text>
        </div>

        <Form
          layout="vertical"
          onFinish={onFinish}
          size="large"
          className="space-y-4"
        >
          <Form.Item
            name="email"
            label={<span className="font-semibold text-gray-700">Correo electrónico</span>}
            rules={[
              { required: true, type: "email", message: "Correo inválido" }
            ]}
          >
            <Input
              placeholder="admin@rede.com"
              className="rounded-lg h-11"
              prefix={<i className="ri-mail-line text-gray-500 mr-2" />}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="font-semibold text-gray-700">Contraseña</span>}
            rules={[{ required: true, message: "Ingrese su contraseña" }]}
          >
            <Input.Password
              placeholder="••••••••"
              className="rounded-lg h-11"
              prefix={<i className="ri-lock-line text-gray-500 mr-2" />}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            className="rounded-lg font-bold h-12 text-base transition-transform hover:scale-[1.02]"
          >
            Entrar
          </Button>
        </Form>
      </Card>
    </div>
  );
}
