import { Layout } from 'antd';
import SidebarNav from '../components/SidebarNav';
import Topbar from '../components/Topbar';
import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useTokenStore } from '../lib/api';

const { Sider, Header, Content } = Layout;

export default function MainLayout() {
  const token = useAuthStore(s => s.token);
  const setToken = useTokenStore(s => s.setToken);

  // Sincronizar token del auth store con el token store para el interceptor de axios
  useEffect(() => {
    console.log('🔍 MainLayout: token del auth store:', token ? token.substring(0, 20) + '...' : 'null');
    if (token) {
      console.log('🔄 Sincronizando token del auth store al token store para axios');
      setToken(token);
    } else {
      console.warn('⚠️ No hay token en el auth store para sincronizar');
    }
  }, [token, setToken]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div className="text-white text-center py-4 font-semibold">Almacén</div>
        <SidebarNav />
      </Sider>
      <Layout>
        <Header className="bg-white">
          <Topbar />
        </Header>
        <Content className="p-4">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
