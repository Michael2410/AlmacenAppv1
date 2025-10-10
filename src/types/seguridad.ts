import type { ID } from './common';

// Permisos granulares organizados por módulo
export type Permission =
  // Sistema y Administración
  | 'users.manage'
  | 'roles.manage'
  | 'system.config'
  
  // Proveedores
  | 'providers.view'
  | 'providers.create'
  | 'providers.update'
  | 'providers.delete'
  
  // Productos
  | 'products.view'
  | 'products.create'
  | 'products.update'
  | 'products.delete'
  
  // Ingresos
  | 'ingresos.view'
  | 'ingresos.create'
  | 'ingresos.update'
  | 'ingresos.delete'
  
  // Inventario
  | 'inventory.viewSelf'
  | 'inventory.viewAll'
  | 'inventory.assign'
  
  // Pedidos
  | 'pedidos.view'
  | 'pedidos.create'
  | 'pedidos.approve'
  | 'pedidos.reject'
  | 'pedidos.deliver'
  
  // Reportes
  | 'reports.view'
  | 'reports.export'
  | 'reports.advanced'
  
  // Catálogos
  | 'areas.manage'
  | 'ubicaciones.manage'
  | 'unidades.manage';

export interface Role {
  id: ID;
  name: string;
  permissions: Permission[];
  predefined?: boolean;
  active?: boolean;
}

// Grupos de permisos para facilitar la gestión
export const PERMISSION_GROUPS = {
  'Sistema': [
    'users.manage',
    'roles.manage', 
    'system.config'
  ],
  'Proveedores': [
    'providers.view',
    'providers.create',
    'providers.update',
    'providers.delete'
  ],
  'Productos': [
    'products.view',
    'products.create',
    'products.update',
    'products.delete'
  ],
  'Ingresos': [
    'ingresos.view',
    'ingresos.create',
    'ingresos.update',
    'ingresos.delete'
  ],
  'Inventario': [
    'inventory.viewSelf',
    'inventory.viewAll',
    'inventory.assign'
  ],
  'Pedidos': [
    'pedidos.view',
    'pedidos.create',
    'pedidos.approve',
    'pedidos.reject',
    'pedidos.deliver'
  ],
  'Reportes': [
    'reports.view',
    'reports.export',
    'reports.advanced'
  ],
  'Catálogos': [
    'areas.manage',
    'ubicaciones.manage',
    'unidades.manage'
  ]
} as const;

// Descripciones de permisos para la UI
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  // Sistema
  'users.manage': 'Gestionar usuarios del sistema',
  'roles.manage': 'Gestionar roles y permisos',
  'system.config': 'Configuración del sistema',
  
  // Proveedores
  'providers.view': 'Ver proveedores',
  'providers.create': 'Crear proveedores',
  'providers.update': 'Editar proveedores',
  'providers.delete': 'Eliminar proveedores',
  
  // Productos
  'products.view': 'Ver productos',
  'products.create': 'Crear productos',
  'products.update': 'Editar productos',
  'products.delete': 'Eliminar productos',
  
  // Ingresos
  'ingresos.view': 'Ver ingresos',
  'ingresos.create': 'Registrar ingresos',
  'ingresos.update': 'Editar ingresos',
  'ingresos.delete': 'Eliminar ingresos',
  
  // Inventario
  'inventory.viewSelf': 'Ver mi inventario personal',
  'inventory.viewAll': 'Ver todo el inventario',
  'inventory.assign': 'Asignar productos a usuarios',
  
  // Pedidos
  'pedidos.view': 'Ver pedidos',
  'pedidos.create': 'Crear pedidos/solicitudes',
  'pedidos.approve': 'Aprobar pedidos',
  'pedidos.reject': 'Rechazar pedidos',
  'pedidos.deliver': 'Marcar como entregado',
  
  // Reportes
  'reports.view': 'Ver reportes básicos',
  'reports.export': 'Exportar reportes',
  'reports.advanced': 'Reportes avanzados',
  
  // Catálogos
  'areas.manage': 'Gestionar áreas',
  'ubicaciones.manage': 'Gestionar ubicaciones',
  'unidades.manage': 'Gestionar unidades de medida'
};

export const PREDEFINED_ROLES: Record<string, Role> = {
  ADMIN: {
    id: 'role-admin',
    name: 'Administrador',
    permissions: [
      'users.manage', 'roles.manage', 'system.config',
      'providers.view', 'providers.create', 'providers.update', 'providers.delete',
      'products.view', 'products.create', 'products.update', 'products.delete',
      'ingresos.view', 'ingresos.create', 'ingresos.update', 'ingresos.delete',
      'inventory.viewSelf', 'inventory.viewAll', 'inventory.assign',
      'reports.view', 'reports.export', 'reports.advanced',
      'pedidos.view', 'pedidos.approve', 'pedidos.reject', 'pedidos.deliver',
      'areas.manage', 'ubicaciones.manage', 'unidades.manage'
    ],
    predefined: true
  }
};

export interface User {
  id: ID;
  nombres: string;
  email: string;
  roleId: ID;
  permissions?: Permission[]; // overrides/extra
}
