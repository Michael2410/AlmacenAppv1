import type { Permission, Role } from '../types/seguridad';
import type { AuthUser } from '../types/auth';

/** Combine role permissions and user overrides */
export function resolveUserPermissions(user: AuthUser | null, roles: Role[]): Permission[] {
  if (!user) return [];
  const role = roles.find(r => r.id === user.roleId);
  const base = role?.permissions ?? [];
  const extra = user.permissions ?? [];
  return Array.from(new Set([...base, ...extra]));
}

export function hasPermission(user: AuthUser | null, roles: Role[], required: Permission | Permission[]): boolean {
  const need = Array.isArray(required) ? required : [required];
  const perms = resolveUserPermissions(user, roles);
  return need.every(p => perms.includes(p));
}
