import type { ID } from './common';

export type Permission =
  | 'users.manage'
  | 'roles.manage'
  | 'providers.view'
  | 'providers.create'
  | 'providers.update'
  | 'providers.delete'
  | 'products.view'
  | 'products.create'
  | 'products.update'
  | 'products.delete'
  | 'ingresos.view'
  | 'ingresos.create'
  | 'ingresos.update'
  | 'ingresos.delete'
  | 'inventory.viewSelf'
  | 'inventory.viewAll'
  | 'inventory.assign'
  | 'reports.view'
  | 'reports.export';

export interface Role {
  id: ID;
  name: string;
  permissions: Permission[];
}

export const PREDEFINED_ROLES: Record<string, Role> = {
  ENCARGADO_ALMACEN: {
    id: 'role-encargado',
    name: 'Encargado de Almacén',
    permissions: [
      'users.manage',
      'roles.manage',
      'providers.view', 'providers.create', 'providers.update', 'providers.delete',
      'products.view', 'products.create', 'products.update', 'products.delete',
      'ingresos.view', 'ingresos.create', 'ingresos.update', 'ingresos.delete',
      'inventory.viewSelf', 'inventory.viewAll', 'inventory.assign',
      'reports.view', 'reports.export',
    ],
  },
  TRABAJADOR: {
    id: 'role-trabajador',
    name: 'Trabajador',
    permissions: [
      'inventory.viewSelf',
      'products.view',
      'providers.view',
      'reports.view',
    ],
  },
};

export interface User {
  id: ID;
  nombres: string;
  email: string;
  roleId: ID;
  permissions?: Permission[]; // overrides/extra
}
