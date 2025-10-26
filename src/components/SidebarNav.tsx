import { Menu } from 'antd';
import { DashboardOutlined, ProfileOutlined, AppstoreOutlined, TeamOutlined, UserOutlined, FileTextOutlined, StockOutlined, ShoppingCartOutlined, DatabaseOutlined, EnvironmentOutlined, CalculatorOutlined, ExclamationCircleOutlined, FileDoneOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function SidebarNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const has = useAuthStore(s => s.hasPermission);
  const bold = (content: React.ReactNode) => (
    <span style={{ fontWeight: 700, fontSize: '16px' }}>{content}</span>
  );

  // Construir menú completo basado SOLO en permisos
  const items = [
    // Dashboard - siempre visible para usuarios autenticados
    { key: '/dashboard', icon: <DashboardOutlined />, label: bold('Dashboard') },
    
    // Mi Área Personal
    has(['inventory.viewSelf']) ? { key: '/inventario/mi-inventario', icon: <StockOutlined />, label: bold('Mi Inventario') } : null,
    has(['inventory.createSalidas']) ? { key: '/inventario/salidas', icon: <StockOutlined />, label: bold('Mis Salidas') } : null,
    has(['pedidos.create']) ? { key: '/pedidos/mios', icon: <ShoppingCartOutlined />, label: bold('Solicitar Productos') } : null,
    
    // Grupo Inventario
    ...(has(['ingresos.view']) || has(['ingresos.create']) || has(['inventory.viewAll']) || has(['salidas.view']) || has(['vencidos.view']) ? [{
      key: 'inventario-group',
      icon: <StockOutlined />,
      label: bold('Inventario'),
      children: [
        has(['ingresos.view']) ? { key: '/ingresos', icon: <ProfileOutlined />, label: bold('Ingresos') } : null,
        has(['inventory.viewAll']) ? { key: '/inventario', icon: <DatabaseOutlined />, label: bold('Almacén') } : null,
        has(['salidas.view']) ? { key: '/salidas', icon: <StockOutlined />, label: bold('Bajas de Inventario') } : null,
        has(['vencidos.view']) ? { key: '/inventario/vencidos', icon: <ExclamationCircleOutlined />, label: bold('Productos Vencidos') } : null,
      ].filter(Boolean)
    }] : []),
    
    // Pedidos Admin
    has(['inventory.assign']) ? { key: '/pedidos/admin', icon: <ShoppingCartOutlined />, label: bold('Pedidos') } : null,
    
    // Grupo Catálogos
    ...(has(['providers.view']) || has(['products.view']) || has(['areas.manage']) || has(['ubicaciones.manage']) || has(['unidades.manage']) ? [{
      key: 'catalogo-group',
      icon: <DatabaseOutlined />,
      label: bold('Catálogos'),
      children: [
        has(['providers.view']) ? { key: '/proveedores', icon: <TeamOutlined />, label: bold('Proveedores') } : null,
        has(['products.view']) ? { key: '/productos', icon: <AppstoreOutlined />, label: bold('Productos') } : null,
        has(['areas.manage']) ? { key: '/catalogo/areas', icon: <AppstoreOutlined />, label: bold('Áreas') } : null,
        has(['ubicaciones.manage']) ? { key: '/catalogo/ubicaciones', icon: <EnvironmentOutlined />, label: bold('Ubicaciones') } : null,
        has(['unidades.manage']) ? { key: '/catalogo/unidades-medida', icon: <CalculatorOutlined />, label: bold('Unidades') } : null,
      ].filter(Boolean)
    }] : []),
    
    // Reportes
    has(['reports.view']) ? { key: '/reportes', icon: <FileTextOutlined />, label: bold('Reportes') } : null,
    
    // Grupo Compras
    ...(has(['cotizaciones.view']) || has(['ordenes.view']) ? [{
      key: 'compras-group',
      icon: <ShoppingCartOutlined />,
      label: bold('Compras'),
      children: [
        has(['cotizaciones.view']) ? { key: '/cotizaciones', icon: <FileDoneOutlined />, label: bold('Cotizaciones') } : null,
        has(['ordenes.view']) ? { key: '/ordenes-compra', icon: <ShoppingCartOutlined />, label: bold('Órdenes de Compra') } : null,
      ].filter(Boolean)
    }] : []),
    
    // Grupo Sistema
    ...(has(['users.manage']) || has(['roles.manage']) || has(['empresa.config']) ? [{
      key: 'sistema-group',
      icon: <UserOutlined />,
      label: bold('Sistema'),
      children: [
        has(['users.manage']) ? { key: '/seguridad/usuarios', icon: <UserOutlined />, label: bold('Usuarios') } : null,
        has(['roles.manage']) ? { key: '/seguridad/roles', icon: <UserOutlined />, label: bold('Roles y Permisos') } : null,
        has(['empresa.config']) ? { key: '/configuracion/empresa', icon: <SettingOutlined />, label: bold('Configuración') } : null,
      ].filter(Boolean)
    }] : []),
  ].filter(Boolean) as any[];

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
