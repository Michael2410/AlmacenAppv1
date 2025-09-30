import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Permission, Role } from '../types/seguridad';
import type { AuthUser } from '../types/auth';

interface AuthStoreState {
  token: string | null;
  user: AuthUser | null;
  roles: Role[];
  login: (user: AuthUser, token: string, roles: Role[]) => void;
  logout: () => void;
  hasPermission: (p: Permission | Permission[]) => boolean;
}

export const useAuthStore = create<AuthStoreState>()(persist((set, get) => ({
  token: null,
  user: null,
  roles: [],
  login: (user, token, roles) => set({ user, token, roles }),
  logout: () => set({ user: null, token: null }),
  hasPermission: (p) => {
    const need = Array.isArray(p) ? p : [p];
    const { user, roles } = get();
    if (!user) return false;
    const role = roles.find(r => r.id === user.roleId);
    const base = role?.permissions ?? [];
    const extra = user.permissions ?? [];
    const merged = new Set([...base, ...extra]);
    return need.every(x => merged.has(x));
  },
}), { name: 'auth' }));
