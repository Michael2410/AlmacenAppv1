import { Layout } from 'antd';
import SidebarNav from '../components/SidebarNav';
import Topbar from '../components/Topbar';
import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useTokenStore } from '../lib/api';
import StockAlertBadge from '../components/Stock/StockAlertBadge';
import ExpiringAlertBadge from '../components/Stock/ExpiringAlertBadge';
import LowStockModal from '../components/Stock/LowStockModal';
import ExpiringProductsModal from '../components/Stock/ExpiringProductsModal';

const { Sider, Header, Content } = Layout;

export default function MainLayout() {
  const token = useAuthStore(s => s.token);
  const setToken = useTokenStore(s => s.setToken);
  const has = useAuthStore(s => s.hasPermission);
  const [lowStockModalOpen, setLowStockModalOpen] = useState(false);
  const [expiringModalOpen, setExpiringModalOpen] = useState(false);

  // Sincronizar token del auth store con el token store para el interceptor de axios
  useEffect(() => {
    if (token) {
      setToken(token);
    }
  }, [token, setToken]);

  // Solo mostrar alerta si tiene permisos de inventario
  const canViewStock = has(['inventory.viewAll']) || has(['inventory.viewSelf']) || has(['products.view']);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div className="text-white text-center py-4 font-semibold">StokUp</div>
        <SidebarNav />
        
        {/* Alerta de Stock Bajo */}
        {canViewStock && (
          <div style={{ marginTop: 'auto', paddingBottom: '16px' }}>
            <StockAlertBadge onClick={() => setLowStockModalOpen(true)} />
            <ExpiringAlertBadge onClick={() => setExpiringModalOpen(true)} />
          </div>
        )}
      </Sider>
      <Layout>
        <Header className="bg-white">
          <Topbar />
        </Header>
        <Content className="p-4">
          <Outlet />
        </Content>
      </Layout>

      {/* Modal de Stock Bajo */}
      <LowStockModal 
        open={lowStockModalOpen} 
        onClose={() => setLowStockModalOpen(false)} 
      />

      {/* Modal de Productos Próximos a Vencer */}
      <ExpiringProductsModal 
        open={expiringModalOpen} 
        onClose={() => setExpiringModalOpen(false)} 
      />
    </Layout>
  );
}
