import { Menu } from 'antd';
import { DashboardOutlined, FileAddOutlined, ProfileOutlined, AppstoreOutlined, TeamOutlined, UserOutlined, FileTextOutlined, StockOutlined, ShoppingCartOutlined, DatabaseOutlined, EnvironmentOutlined, CalculatorOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function SidebarNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const has = useAuthStore(s => s.hasPermission);
  const roleId = useAuthStore(s => s.user?.roleId);
  const user = useAuthStore(s => s.user);
  const roles = useAuthStore(s => s.roles);

  // Obtener permisos del usuario para debug
  const userRole = roles.find(r => r.id === user?.roleId);
  const allPermissions = [...(userRole?.permissions || []), ...(user?.permissions || [])];

  // Debug logs
  console.log('🔍 SidebarNav Debug:', {
    roleId,
    userEmail: user?.email,
    rolesCount: roles.length,
    userRoleName: userRole?.name,
    allPermissions,
    hasInventoryAssign: has(['inventory.assign']),
    hasUsersManage: has(['users.manage']),
    hasProductsView: has(['products.view']),
    hasAreasManage: has(['areas.manage']),
    hasUbicacionesManage: has(['ubicaciones.manage']),
    hasUnidadesManage: has(['unidades.manage'])
  });

  const workerItems = [
    has(['inventory.viewSelf']) ? { key: '/inventario', icon: <StockOutlined />, label: 'Mi Inventario' } : null,
    has(['inventory.viewSelf']) ? { key: '/inventario/salidas', icon: <StockOutlined />, label: 'Salidas' } : null,
    has(['inventory.viewSelf']) ? { key: '/pedidos/mios', icon: <ShoppingCartOutlined />, label: 'Solicitar Productos' } : null,
  ].filter(Boolean) as any[];

  const adminItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    // Grupo Inventario
    ...(has(['ingresos.view']) || has(['ingresos.create']) || has(['inventory.viewAll']) ? [{
      key: 'inventario-group',
      icon: <StockOutlined />,
      label: 'Inventario',
      children: [
        has(['ingresos.view']) ? { key: '/ingresos', icon: <ProfileOutlined />, label: 'Ingresos' } : null,
        has(['ingresos.create']) ? { key: '/ingresos/nuevo', icon: <FileAddOutlined />, label: 'Nuevo Ingreso' } : null,
        has(['inventory.viewAll']) ? { key: '/inventario', icon: <DatabaseOutlined />, label: 'Almacén' } : null,
      ].filter(Boolean)
    }] : []),
    // Grupo Pedidos
    has(['inventory.assign']) ? { key: '/pedidos/admin', icon: <ShoppingCartOutlined />, label: 'Pedidos' } : null,
    // Grupo Catálogos
    ...(has(['providers.view']) || has(['products.view']) || has(['areas.manage']) || has(['ubicaciones.manage']) || has(['unidades.manage']) ? [{
      key: 'catalogo-group',
      icon: <DatabaseOutlined />,
      label: 'Catálogos',
      children: [
        has(['providers.view']) ? { key: '/proveedores', icon: <TeamOutlined />, label: 'Proveedores' } : null,
        has(['products.view']) ? { key: '/productos', icon: <AppstoreOutlined />, label: 'Productos' } : null,
        has(['areas.manage']) ? { key: '/catalogo/areas', icon: <AppstoreOutlined />, label: 'Áreas' } : null,
        has(['ubicaciones.manage']) ? { key: '/catalogo/ubicaciones', icon: <EnvironmentOutlined />, label: 'Ubicaciones' } : null,
        has(['unidades.manage']) ? { key: '/catalogo/unidades-medida', icon: <CalculatorOutlined />, label: 'Unidades' } : null,
      ].filter(Boolean)
    }] : []),
    has(['reports.view']) ? { key: '/reportes', icon: <FileTextOutlined />, label: 'Reportes' } : null,
    // Grupo Sistema (solo para administrador)
    ...(has(['users.manage']) || has(['roles.manage']) ? [{
      key: 'sistema-group',
      icon: <UserOutlined />,
      label: 'Sistema',
      children: [
        has(['users.manage']) ? { key: '/seguridad/usuarios', icon: <UserOutlined />, label: 'Usuarios' } : null,
        has(['roles.manage']) ? { key: '/seguridad/roles', icon: <UserOutlined />, label: 'Roles y Permisos' } : null,
      ].filter(Boolean)
    }] : []),
  ].filter(Boolean) as any[];

  // Determinar si mostrar menú de admin basado en permisos, no en roleId
  const hasAdminPermissions = has(['products.view']) || has(['ingresos.view']) || has(['providers.view']) || has(['users.manage']);
  
  const itemsRaw = hasAdminPermissions ? adminItems : workerItems;
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
