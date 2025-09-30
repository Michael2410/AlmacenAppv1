import { create } from 'zustand';
import type { Role, Permission } from '../types/seguridad';
import { PREDEFINED_ROLES } from '../types/seguridad';
import type { AuthUser } from '../types/auth';

interface RolesStore {
  roles: Role[];
  users: AuthUser[];
  addRole: (role: Role) => void;
  updateRole: (id: string, data: Partial<Role>) => void;
  removeRole: (id: string) => void;
  setUserPermissions: (userId: string, perms: Permission[]) => void;
}

export const useRolesStore = create<RolesStore>((set) => ({
  roles: Object.values(PREDEFINED_ROLES),
  users: [],
  addRole: (role) => set((s) => ({ roles: [...s.roles, role] })),
  updateRole: (id, data) => set((s) => ({ roles: s.roles.map(r => r.id === id ? { ...r, ...data } : r) })),
  removeRole: (id) => set((s) => ({ roles: s.roles.filter(r => r.id !== id) })),
  setUserPermissions: (userId, perms) => set((s) => ({ users: s.users.map(u => u.id === userId ? { ...u, permissions: perms } : u) })),
}));
