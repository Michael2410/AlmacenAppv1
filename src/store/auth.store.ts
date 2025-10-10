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
  login: (user, token, roles) => {
    console.log('Auth store login called with:', { user, token: token ? token.substring(0, 20) + '...' : 'null', rolesCount: roles.length });
    set({ user, token, roles });
    console.log('Auth store state after login:', { user: user.email, hasToken: !!token, rolesCount: roles.length });
  },
  logout: () => {
    console.log('Auth store logout called');
    set({ user: null, token: null, roles: [] });
  },
  hasPermission: (p) => {
    const need = Array.isArray(p) ? p : [p];
    const { user, roles } = get();
    
    console.log('hasPermission check:', {
      need,
      user: user?.email,
      roleId: user?.roleId,
      rolesLength: roles.length
    });
    
    if (!user) {
      console.log('hasPermission: No user');
      return false;
    }
    
    const role = roles.find(r => r.id === user.roleId);
    console.log('hasPermission role found:', role?.name, role?.permissions);
    
    const base = role?.permissions ?? [];
    const extra = user.permissions ?? [];
    const merged = new Set([...base, ...extra]);
    
    console.log('hasPermission merged permissions:', Array.from(merged));
    
    const result = need.every(x => merged.has(x));
    console.log('hasPermission result:', result);
    
    return result;
  },
}), { name: 'auth' }));
