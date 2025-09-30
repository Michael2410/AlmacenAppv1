import type { ID } from './common';
import type { Permission } from './seguridad';

export interface AuthStateShape {
  token: string | null;
  user: AuthUser | null;
}

export interface AuthUser {
  id: ID;
  nombres: string;
  email: string;
  roleId: ID;
  permissions?: Permission[];
}
