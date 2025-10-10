import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import RouteErrorBoundary from '../layouts/RouteErrorBoundary';
import DashboardPage from '../pages/dashboard/DashboardPage';
import IngresosListPage from '../pages/ingresos/IngresosListPage';
import NuevoIngresoPage from '../pages/ingresos/NuevoIngresoPage';
// import MiInventarioPage from '../pages/inventario/MiInventarioPage';
import InventarioPage from '../pages/inventario/InventarioPage';
// AsignacionesPage eliminado
import ProveedoresListPage from '../pages/proveedores/ProveedoresListPage';
import ProductosListPage from '../pages/productos/ProductosListPage';
import ReportesPage from '../pages/reportes/ReportesPage';
import RolesPermisosPage from '../pages/seguridad/RolesPermisosPage';
import RolesPage from '../pages/sistema/RolesPage';
import UsuariosPage from '../pages/seguridad/UsuariosPage';
import AreasPage from '../pages/catalogo/AreasPage';
import UbicacionesPage from '../pages/catalogo/UbicacionesPage';
import UnidadesMedidaPage from '../pages/catalogo/UnidadesMedidaPage';
import Forbidden403 from '../pages/errores/Forbidden403';
import PermissionGuard from '../layouts/PermissionGuard';
import LoginPage from '../pages/auth/LoginPage';
import PedidosAdminPage from '../pages/pedidos/PedidosAdminPage';
import MisPedidosPage from '../pages/pedidos/MisPedidosPage';
// import AlmacenGeneralPage from '../pages/inventario/AlmacenGeneralPage';
import AuthGuard from '../layouts/AuthGuard';
import HomeRedirect from '../layouts/HomeRedirect';
import SalidasPage from '../pages/inventario/SalidasPage';
import TestPage from '../pages/test/TestPage';
import DebugLoginPage from '../pages/debug/DebugLoginPage';
import AutoLoginWorkerPage from '../pages/debug/AutoLoginWorkerPage';
import DirectLoginPage from '../pages/debug/DirectLoginPage';
import LogoutPage from '../pages/debug/LogoutPage';

export const router = createBrowserRouter([
  {
    path: '/',
  element: (<AuthGuard><MainLayout /></AuthGuard>),
  errorElement: <RouteErrorBoundary />,
    children: [
  { index: true, element: <HomeRedirect /> },
      { path: '/dashboard', element: <DashboardPage /> },
  { path: '/ingresos', element: (<PermissionGuard require={['ingresos.view']}><IngresosListPage /></PermissionGuard>) },
  { path: '/ingresos/nuevo', element: (<PermissionGuard require={['ingresos.create']}><NuevoIngresoPage /></PermissionGuard>) },
    { path: '/inventario', element: (<PermissionGuard require={['inventory.viewSelf']}><InventarioPage /></PermissionGuard>) },
    { path: '/inventario/salidas', element: (<PermissionGuard require={['inventory.viewSelf']}><SalidasPage /></PermissionGuard>) },
    { path: '/test', element: <TestPage /> },
    { path: '/debug', element: <DebugLoginPage /> },
    { path: '/pedidos/mios', element: (<PermissionGuard require={['pedidos.create']}><MisPedidosPage /></PermissionGuard>) },
      
  { path: '/pedidos/admin', element: (<PermissionGuard require={['inventory.assign']}><PedidosAdminPage /></PermissionGuard>) },
      { path: '/proveedores', element: (<PermissionGuard require={['providers.view']}><ProveedoresListPage /></PermissionGuard>) },
      { path: '/productos', element: (<PermissionGuard require={['products.view']}><ProductosListPage /></PermissionGuard>) },
      { path: '/catalogo/areas', element: (<PermissionGuard require={['products.view']}><AreasPage /></PermissionGuard>) },
      { path: '/catalogo/ubicaciones', element: (<PermissionGuard require={['products.view']}><UbicacionesPage /></PermissionGuard>) },
      { path: '/catalogo/unidades-medida', element: (<PermissionGuard require={['products.view']}><UnidadesMedidaPage /></PermissionGuard>) },
      { path: '/reportes', element: (<PermissionGuard require={['reports.view']}><ReportesPage /></PermissionGuard>) },
      { path: '/seguridad/roles', element: (<PermissionGuard require={['roles.manage']}><RolesPage /></PermissionGuard>) },
      { path: '/seguridad/roles-permisos', element: (<PermissionGuard require={['roles.manage']}><RolesPermisosPage /></PermissionGuard>) },
      { path: '/seguridad/usuarios', element: (<PermissionGuard require={['users.manage']}><UsuariosPage /></PermissionGuard>) },
    ],
  },
  { path: '/403', element: <Forbidden403 /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/auto-login-worker', element: <AutoLoginWorkerPage /> },
  { path: '/direct-login', element: <DirectLoginPage /> },
  { path: '/logout', element: <LogoutPage /> },
]);

export default router;
