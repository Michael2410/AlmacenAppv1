import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import InventarioPage from '../pages/inventario/InventarioPage';
import IngresosListPage from '../pages/ingresos/IngresosListPage';
import ProveedoresListPage from '../pages/proveedores/ProveedoresListPage';
import ProductosListPage from '../pages/productos/ProductosListPage';
import UsuariosPage from '../pages/seguridad/UsuariosPage';
import RolesPage from '../pages/sistema/RolesPage';
import MiInventarioPage from '../pages/inventario/MiInventarioPage';
import MisSalidasPage from '../pages/inventario/MisSalidasPage';
import MisPedidosPage from '../pages/pedidos/MisPedidosPage';
import PedidosAdminPage from '../pages/pedidos/PedidosAdminPage';
import SalidasAdminPage from '../pages/salidas/SalidasPage';
import ProductosVencidosPage from '../pages/inventario/ProductosVencidosPage';
import CotizacionesPage from '../pages/cotizaciones/CotizacionesPage';
import OrdenesCompraPage from '../pages/ordenes-compra/OrdenesCompraPage';
import EmpresaPage from '../pages/configuracion/EmpresaPage';
import AreasPage from '../pages/catalogo/AreasPage';
import UbicacionesPage from '../pages/catalogo/UbicacionesPage';
import UnidadesMedidaPage from '../pages/catalogo/UnidadesMedidaPage';
import ReportesPage from '../pages/reportes/ReportesPage';
import Forbidden403 from '../pages/errores/Forbidden403';
// import NuevoIngresoPage from '../pages/ingresos/NuevoIngresoPage'; // Eliminado - funcionalidad en modal
import PermissionGuard from '../layouts/PermissionGuard';

// Páginas de debug comentadas - solo para desarrollo
// import TestPage from '../pages/debug/TestPage';
// import DebugLoginPage from '../pages/debug/DebugLoginPage';
// import DebugPermissionsPage from '../pages/debug/DebugPermissionsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/403',
    element: <Forbidden403 />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'inventario',
        element: (
          <PermissionGuard require={['inventory.viewAll']}>
            <InventarioPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'inventario/mi-inventario',
        element: (
          <PermissionGuard require={['inventory.viewSelf']}>
            <MiInventarioPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'inventario/salidas',
        element: (
          <PermissionGuard require={['inventory.createSalidas']}>
            <MisSalidasPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'ingresos',
        element: (
          <PermissionGuard require={['ingresos.view']}>
            <IngresosListPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'ingresos/nuevo',
        element: (
          <PermissionGuard require={['ingresos.create']}>
            <IngresosListPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'proveedores',
        element: (
          <PermissionGuard require={['providers.view']}>
            <ProveedoresListPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'productos',
        element: (
          <PermissionGuard require={['products.view']}>
            <ProductosListPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'seguridad/usuarios',
        element: (
          <PermissionGuard require={['users.manage']}>
            <UsuariosPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'seguridad/roles',
        element: (
          <PermissionGuard require={['roles.manage']}>
            <RolesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'pedidos/mios',
        element: (
          <PermissionGuard require={['pedidos.create']}>
            <MisPedidosPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'pedidos/admin',
        element: (
          <PermissionGuard require={['inventory.assign']}>
            <PedidosAdminPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'salidas',
        element: (
          <PermissionGuard require={['salidas.view']}>
            <SalidasAdminPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'inventario/vencidos',
        element: (
          <PermissionGuard require={['vencidos.view']}>
            <ProductosVencidosPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'cotizaciones',
        element: (
          <PermissionGuard require={['cotizaciones.view']}>
            <CotizacionesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'ordenes-compra',
        element: (
          <PermissionGuard require={['ordenes.view']}>
            <OrdenesCompraPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'reportes',
        element: (
          <PermissionGuard require={['reports.view']}>
            <ReportesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'configuracion/empresa',
        element: (
          <PermissionGuard require={['empresa.config']}>
            <EmpresaPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'catalogo/areas',
        element: (
          <PermissionGuard require={['areas.manage']}>
            <AreasPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'catalogo/ubicaciones',
        element: (
          <PermissionGuard require={['ubicaciones.manage']}>
            <UbicacionesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'catalogo/unidades-medida',
        element: (
          <PermissionGuard require={['unidades.manage']}>
            <UnidadesMedidaPage />
          </PermissionGuard>
        ),
      },
    ],
  },
]);
