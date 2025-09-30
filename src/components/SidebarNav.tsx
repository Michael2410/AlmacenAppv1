import { Menu } from 'antd';
import { DashboardOutlined, FileAddOutlined, ProfileOutlined, AppstoreOutlined, TeamOutlined, UserOutlined, FileTextOutlined, StockOutlined, ShoppingCartOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function SidebarNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const has = useAuthStore(s => s.hasPermission);
  const roleId = useAuthStore(s => s.user?.roleId);

  const workerItems = [
    has(['inventory.viewSelf']) ? { key: '/inventario', icon: <StockOutlined />, label: 'Mi Inventario' } : null,
  has(['inventory.viewSelf']) ? { key: '/inventario/salidas', icon: <StockOutlined />, label: 'Salidas' } : null,
    has(['inventory.viewSelf']) ? { key: '/pedidos/mios', icon: <ShoppingCartOutlined />, label: 'Mis Pedidos' } : null,
  ].filter(Boolean) as any[];

  const adminItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    has(['ingresos.view']) ? { key: '/ingresos', icon: <ProfileOutlined />, label: 'Ingresos' } : null,
    has(['ingresos.create']) ? { key: '/ingresos/nuevo', icon: <FileAddOutlined />, label: 'Nuevo Ingreso' } : null,
  has(['inventory.viewAll']) ? { key: '/inventario/almacen', icon: <DatabaseOutlined />, label: 'Almacén General' } : null,
    //has(['inventory.assign']) ? { key: '/inventario/asignaciones', icon: <AppstoreOutlined />, label: 'Asignaciones' } : null,
    has(['inventory.assign']) ? { key: '/pedidos/admin', icon: <ShoppingCartOutlined />, label: 'Pedidos (Admin)' } : null,
    has(['providers.view']) ? { key: '/proveedores', icon: <TeamOutlined />, label: 'Proveedores' } : null,
    has(['products.view']) ? { key: '/productos', icon: <AppstoreOutlined />, label: 'Productos' } : null,
    has(['reports.view']) ? { key: '/reportes', icon: <FileTextOutlined />, label: 'Reportes' } : null,
    has(['users.manage']) ? { key: '/seguridad/usuarios', icon: <UserOutlined />, label: 'Usuarios' } : null,
  ].filter(Boolean) as any[];

  const itemsRaw = roleId === 'role-encargado' ? adminItems : workerItems;
  const items = (itemsRaw as any[]).filter(
    (it) => it && it.key !== '/inventario/asignaciones' && it.label !== 'Asignaciones'
  );

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      onClick={(e) => navigate(e.key)}
      items={items}
    />
  );
}
