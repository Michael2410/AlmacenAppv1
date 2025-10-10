import axios from 'axios';
import type { Proveedor, Producto, Area, Ubicacion, UnidadMedida } from '../types/catalogo';
import type { Ingreso } from '../types/ingreso';
import type { ApiResult } from '../types/common';
import type { User } from '../types/seguridad';
import dayjs from 'dayjs';
import { create } from 'zustand';

// Local auth token accessor for interceptor (lightweight store)
type TokenState = { token: string | null; setToken: (t: string | null) => void };
export const useTokenStore = create<TokenState>((set) => ({ token: null, setToken: (t) => set({ token: t }) }));

const USE_MOCKS = (import.meta as any).env?.VITE_USE_MOCKS === 'true';
const envAny = (import.meta as any).env || {};
let baseURL = envAny.VITE_API_URL as string | undefined;
if (!baseURL) {
  const proxy = envAny.VITE_PROXY_TARGET as string | undefined;
  baseURL = proxy ? `${proxy.replace(/\/$/, '')}/api` : '/api';
}
export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = useTokenStore.getState().token;
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // Optionally clear token on 401
      useTokenStore.getState().setToken(null);
    }
    return Promise.reject(err);
  }
);

// --- Mock data ---
const mockDelay = <T,>(data: T, ms = 400): Promise<ApiResult<T>> => new Promise((res) => setTimeout(() => res({ success: true, data }), ms));

const areas: Area[] = [
  { id: 'a1', nombre: 'Principal' },
  { id: 'a2', nombre: 'Secundario' },
];
const ubicaciones: Ubicacion[] = [
  { id: 'u1', nombre: 'Estante A' },
  { id: 'u2', nombre: 'Estante B' },
];
const proveedores: Proveedor[] = [
  { id: 'p1', nombre: 'Proveedor Alpha', direccion: 'Av. 1', contacto: 'Juan Perez', telefono: '999-111' },
  { id: 'p2', nombre: 'Proveedor Beta', direccion: 'Av. 2', contacto: 'Maria Gomez' },
];
const productos: Producto[] = [
  { id: 'pr1', nombre: 'Tornillo', marca: 'Stanley', unidad: 'UNIDAD' as UnidadMedida, areaId: 'a1', ubicacionId: 'u1', activo: true },
  { id: 'pr2', nombre: 'Cable', marca: 'Indeco', unidad: 'M' as UnidadMedida, areaId: 'a2', ubicacionId: 'u2', activo: true },
];
let ingresos: Ingreso[] = [
  {
    id: 'i1', productoId: 'pr1', proveedorId: 'p1', nombre: 'Tornillo cabeza hexagonal',
    fechaIngreso: dayjs().subtract(3, 'day').toISOString(), cantidad: 100, unidad: 'UNIDAD' as UnidadMedida,
    precio: 0.5, areaId: 'a1', ubicacionId: 'u1',
  },
];

// --- Real backend services ---
const realServices = {
  auth: {
    login: async (email: string, password: string) => {
      const { data } = await api.post('/auth/login', { email, password });
      return data as ApiResult<{ token: string; user: any; roles?: any[] }>;
    },
  },
  users: {
    list: async () => (await api.get('/users')).data as ApiResult<User[]>,
    create: async (data: Omit<User,'id'>) => (await api.post('/users', data)).data as ApiResult<User>,
    update: async (id: string, data: Partial<User>) => (await api.put(`/users/${id}`, data)).data as ApiResult<User>,
    remove: async (id: string) => (await api.delete(`/users/${id}`)).data as ApiResult<boolean>,
  },
  roles: {
    list: async () => (await api.get('/roles')).data as ApiResult<any[]>,
  },
  proveedores: {
    list: async () => (await api.get('/proveedores')).data as ApiResult<Proveedor[]>,
    create: async (data: Omit<Proveedor,'id'>) => (await api.post('/proveedores', data)).data as ApiResult<Proveedor>,
    update: async (id: string, data: Partial<Proveedor>) => (await api.put(`/proveedores/${id}`, data)).data as ApiResult<Proveedor>,
    remove: async (id: string) => (await api.delete(`/proveedores/${id}`)).data as ApiResult<boolean>,
  },
  productos: {
    list: async () => (await api.get('/productos')).data as ApiResult<Producto[]>,
    create: async (data: Omit<Producto,'id'>) => (await api.post('/productos', data)).data as ApiResult<Producto>,
    update: async (id: string, data: Partial<Producto>) => (await api.put(`/productos/${id}`, data)).data as ApiResult<Producto>,
    remove: async (id: string) => (await api.delete(`/productos/${id}`)).data as ApiResult<boolean>,
  },
  ingresos: {
    list: async () => (await api.get('/ingresos')).data as ApiResult<Ingreso[]>,
    create: async (data: Omit<Ingreso,'id' | 'areaId' | 'ubicacionId' | 'unidad'>) => (await api.post('/ingresos', data)).data as ApiResult<Ingreso>,
  },
  referencias: async () => (await api.get('/referencias')).data as ApiResult<{ areas: Area[]; ubicaciones: Ubicacion[] }>,
  areas: {
    list: async () => (await api.get('/areas')).data as ApiResult<Area[]>,
    create: async (data: Omit<Area,'id'>) => (await api.post('/areas', data)).data as ApiResult<Area>,
    update: async (id: string, data: Partial<Area>) => (await api.put(`/areas/${id}`, data)).data as ApiResult<Area>,
    remove: async (id: string) => (await api.delete(`/areas/${id}`)).data as ApiResult<boolean>,
  },
  ubicaciones: {
    list: async () => (await api.get('/ubicaciones')).data as ApiResult<Ubicacion[]>,
    create: async (data: Omit<Ubicacion,'id'>) => (await api.post('/ubicaciones', data)).data as ApiResult<Ubicacion>,
    update: async (id: string, data: Partial<Ubicacion>) => (await api.put(`/ubicaciones/${id}`, data)).data as ApiResult<Ubicacion>,
    remove: async (id: string) => (await api.delete(`/ubicaciones/${id}`)).data as ApiResult<boolean>,
  },
  unidadesMedida: {
    list: async () => (await api.get('/unidades-medida')).data as ApiResult<any[]>,
    create: async (data: { nombre: string; simbolo: string; activo?: boolean }) => (await api.post('/unidades-medida', data)).data as ApiResult<any>,
    update: async (id: string, data: { nombre?: string; simbolo?: string; activo?: boolean }) => (await api.put(`/unidades-medida/${id}`, data)).data as ApiResult<any>,
    remove: async (id: string) => (await api.delete(`/unidades-medida/${id}`)).data as ApiResult<boolean>,
  },
  stock: {
    mio: async () => (await api.get('/stock/mio')).data as ApiResult<any[]>,
    general: async () => (await api.get('/stock/general')).data as ApiResult<any[]>,
  },
  asignaciones: {
  crear: async (data: { usuarioId: string; productoId: string; cantidad: number; unidad: string; marca?: string | null; areaId?: string; ubicacionId?: string }) => (await api.post('/asignaciones', data)).data as ApiResult<any>,
  },
  salidas: {
    list: async () => (await api.get('/salidas')).data as ApiResult<any[]>,
    create: async (data: { productoId: string; cantidad: number; unidad: UnidadMedida; observacion?: string }) => (await api.post('/salidas', data)).data as ApiResult<any>,
  },
  pedidos: {
    list: async () => (await api.get('/pedidos/admin')).data as ApiResult<any[]>,
    create: async (data: { productoId: string; cantidad: number; unidad: UnidadMedida }) => (await api.post('/pedidos', data)).data as ApiResult<any>,
  createBatch: async (items: Array<{ productoId: string; cantidad: number; unidad: UnidadMedida }>) => (await api.post('/pedidos/batch', { items })).data as ApiResult<any[]>,
    changeEstado: async (id: string, estado: string) => (await api.put(`/pedidos/${id}/estado`, { estado })).data as ApiResult<any>,
  asignar: async (id: string, marca?: string | null) => (await api.post(`/pedidos/${id}/asignar`, { marca: marca ?? null })).data as ApiResult<any>,
  },
};

// Seed mock users including admin
const users: User[] = [
  { id: 'u1', nombres: 'Admin', email: 'admin@demo.com', roleId: 'role-encargado', permissions: [] },
];

export const services = USE_MOCKS ? {
  // mock auth returns token and seeded user
  auth: {
    login: async (email: string, _password: string) => mockDelay({ token: 'demo-token', user: { id: 'u1', nombres: 'Usuario Demo', email, roleId: 'role-encargado' } as any, roles: [] }),
  },
  asignaciones: {
  crear: async (data: { usuarioId: string; productoId: string; cantidad: number; unidad: string; marca?: string | null; areaId?: string; ubicacionId?: string }) =>
      mockDelay({ id: `s${Date.now()}`, ...data }),
  },
  salidas: {
    list: async () => mockDelay([] as any[]),
    create: async (data: any) => mockDelay({ id: `out${Date.now()}`, fecha: new Date().toISOString(), ...data }),
  },
  users: {
    list: async () => mockDelay(users),
    create: async (data: Omit<User,'id'>) => {
      const u: User = { ...data, id: `u${Date.now()}` } as any;
      users.push(u);
      return mockDelay(u);
    },
    update: async (id: string, data: Partial<User>) => {
      const i = users.findIndex(u => u.id === id);
      if (i >= 0) users[i] = { ...users[i], ...data } as any;
      return mockDelay(users[i]);
    },
    remove: async (id: string) => {
      const i = users.findIndex(u => u.id === id);
      if (i >= 0) users.splice(i, 1);
      return mockDelay(true as any);
    },
  },
  roles: {
    list: async () => mockDelay([]),
  },
  proveedores: {
    list: async () => mockDelay(proveedores),
    create: async (data: Omit<Proveedor,'id'>) => {
      const item: Proveedor = { ...data, id: `p${Date.now()}` };
      proveedores.push(item);
      return mockDelay(item);
    },
    update: async (id: string, data: Partial<Proveedor>) => {
      const i = proveedores.findIndex(p => p.id === id);
      if (i >= 0) proveedores[i] = { ...proveedores[i], ...data };
      return mockDelay(proveedores[i]);
    },
    remove: async (id: string) => {
      const idx = proveedores.findIndex(p => p.id === id);
      if (idx >= 0) proveedores.splice(idx, 1);
      return mockDelay(true as unknown as any);
    },
  },
  productos: {
    list: async () => mockDelay(productos),
    create: async (data: Omit<Producto,'id'>) => {
      const item: Producto = { ...data, id: `pr${Date.now()}` } as any;
      productos.push(item);
      return mockDelay(item);
    },
    update: async (id: string, data: Partial<Producto>) => {
      const i = productos.findIndex(p => p.id === id);
      if (i >= 0) productos[i] = { ...productos[i], ...data } as any;
      return mockDelay(productos[i]);
    },
    remove: async (id: string) => {
      const idx = productos.findIndex(p => p.id === id);
      if (idx >= 0) productos.splice(idx, 1);
      return mockDelay(true as unknown as any);
    },
  },
  ingresos: {
    list: async () => mockDelay(ingresos),
    create: async (data: Omit<Ingreso,'id' | 'areaId' | 'ubicacionId' | 'unidad'>) => {
      const item: Ingreso = { ...data, id: `i${Date.now()}`, areaId: 'a1', ubicacionId: 'u1', unidad: 'UNIDAD' };
      ingresos.push(item);
      return mockDelay(item);
    },
  },
  referencias: async () => mockDelay({ areas, ubicaciones }),
  areas: {
    list: async () => mockDelay(areas as any[]),
    create: async (data: Omit<Area,'id'>) => {
      const item = { ...data, id: `a${Date.now()}` };
      areas.push(item);
      return mockDelay(item);
    },
    update: async (id: string, data: Partial<Area>) => {
      const i = areas.findIndex(a => a.id === id);
      if (i >= 0) Object.assign(areas[i], data);
      return mockDelay(areas[i]);
    },
    remove: async (id: string) => {
      const idx = areas.findIndex(a => a.id === id);
      if (idx >= 0) areas.splice(idx, 1);
      return mockDelay(true as unknown as any);
    },
  },
  ubicaciones: {
    list: async () => mockDelay(ubicaciones as any[]),
    create: async (data: Omit<Ubicacion,'id'>) => {
      const item = { ...data, id: `u${Date.now()}` };
      ubicaciones.push(item);
      return mockDelay(item);
    },
    update: async (id: string, data: Partial<Ubicacion>) => {
      const i = ubicaciones.findIndex(u => u.id === id);
      if (i >= 0) Object.assign(ubicaciones[i], data);
      return mockDelay(ubicaciones[i]);
    },
    remove: async (id: string) => {
      const idx = ubicaciones.findIndex(u => u.id === id);
      if (idx >= 0) ubicaciones.splice(idx, 1);
      return mockDelay(true as unknown as any);
    },
  },
  unidadesMedida: {
    list: async () => mockDelay([
      { id: 'um1', nombre: 'Unidad', simbolo: 'UNIDAD', activo: true },
      { id: 'um2', nombre: 'Kilogramo', simbolo: 'KG', activo: true },
      { id: 'um3', nombre: 'Litro', simbolo: 'L', activo: true },
    ]),
    create: async (data: any) => mockDelay({ id: `um${Date.now()}`, ...data, activo: data.activo !== false }),
    update: async (id: string, data: any) => mockDelay({ id, ...data }),
    remove: async (_id: string) => mockDelay(true as unknown as any),
  },
  stock: {
    mio: async () => mockDelay([] as any[]),
    general: async () => mockDelay(productos as any[]),
  },
  pedidos: {
    list: async () => mockDelay([] as any[]),
  create: async (data: any) => mockDelay({ id: `req${Date.now()}`, ...data, estado: 'PENDIENTE', fecha: new Date().toISOString() }),
  createBatch: async (items: any[]) => mockDelay(items.map((it) => ({ id: `req${Date.now()}${Math.floor(Math.random()*1000)}`, ...it, estado: 'PENDIENTE', fecha: new Date().toISOString() }))),
    changeEstado: async (_id: string, _estado: string) => mockDelay(true as any),
  asignar: async (_id: string, _marca?: string | null) => mockDelay(true as any),
  },
} : realServices;

// React Query helper hooks (defined here to keep close to services)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInventarioStore } from '../store/inventario.store';

export const keys = {
  users: ['users'] as const,
  roles: ['roles'] as const,
  proveedores: ['proveedores'] as const,
  productos: ['productos'] as const,
  ingresos: ['ingresos'] as const,
  referencias: ['referencias'] as const,
  areas: ['areas'] as const,
  ubicaciones: ['ubicaciones'] as const,
  unidadesMedida: ['unidades-medida'] as const,
  miInventario: (userId: string) => ['miInventario', userId] as const,
  stockMio: ['stock','mio'] as const,
  stockGeneral: ['stock','general'] as const,
  asignaciones: ['asignaciones'] as const,
  salidas: ['salidas'] as const,
  pedidos: ['pedidos'] as const,
};

export function useProveedores() {
  return useQuery({ queryKey: keys.proveedores, queryFn: services.proveedores.list });
}
export function useUsers() {
  return useQuery({ queryKey: keys.users, queryFn: services.users.list });
}
export function useRoles() {
  return useQuery({ queryKey: keys.roles, queryFn: services.roles.list });
}
export function useProductos() {
  return useQuery({ queryKey: keys.productos, queryFn: services.productos.list });
}
export function useIngresos() {
  return useQuery({ queryKey: keys.ingresos, queryFn: services.ingresos.list });
}
export function useReferencias() {
  return useQuery({ queryKey: keys.referencias, queryFn: services.referencias });
}

export function useMiInventario(userId = 'u1') {
  if (!USE_MOCKS) {
    return useQuery({ queryKey: keys.stockMio, queryFn: services.stock.mio });
  }
  const data = useInventarioStore(s => s.miInventario[userId] ?? []);
  return { data: { data }, isLoading: false } as const;
}

export function useCreateProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.proveedores.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.proveedores }); },
  });
}
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.users.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.users }); },
  });
}
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => services.users.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.users }); },
  });
}
export function useRemoveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => services.users.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.users }); },
  });
}
export function useUpdateProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => services.proveedores.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.proveedores }); },
  });
}
export function useRemoveProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => services.proveedores.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.proveedores }); },
  });
}

export function useCreateIngreso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.ingresos.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.ingresos }); },
  });
}
// Stock and pedidos hooks
export function useStockMio() { return useQuery({ queryKey: keys.stockMio, queryFn: services.stock.mio }); }
export function useStockGeneral() { return useQuery({ queryKey: keys.stockGeneral, queryFn: services.stock.general }); }
export function useCrearAsignacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.asignaciones.crear,
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.stockGeneral }); qc.invalidateQueries({ queryKey: keys.stockMio }); },
  });
}
export function useSalidas() { return useQuery({ queryKey: keys.salidas, queryFn: services.salidas.list }); }
export function useCrearSalida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.salidas.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.salidas }); qc.invalidateQueries({ queryKey: keys.stockMio }); },
  });
}
export function usePedidos() { return useQuery({ queryKey: keys.pedidos, queryFn: services.pedidos.list }); }
export function useCrearPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.pedidos.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.pedidos }); },
  });
}
export function useCrearPedidosBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ productoId: string; cantidad: number; unidad: UnidadMedida }>) => services.pedidos.createBatch(items),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.pedidos }); },
  });
}
export function useCambiarEstadoPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) => services.pedidos.changeEstado(id, estado),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.pedidos }); },
  });
}
export function useAsignarPedido() {
  const qc = useQueryClient();
  return useMutation({
  mutationFn: ({ id, marca }: { id: string; marca?: string | null }) => services.pedidos.asignar(id, marca),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.pedidos }); qc.invalidateQueries({ queryKey: keys.stockMio }); },
  });
}

export function useEntregarLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loteId: string) => {
      const token = useTokenStore.getState().token;
      const res = await fetch(`/api/pedidos/lote/${loteId}/entregar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al entregar lote');
      }
      return res.json();
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: keys.pedidos }); 
      qc.invalidateQueries({ queryKey: keys.stockMio }); 
    },
  });
}

// Auth helper
export async function loginAndSetToken(email: string, password: string) {
  const res = await services.auth.login(email, password);
  const token = (res as any).data?.token ?? (res as any).token;
  const user = (res as any).data?.user ?? (res as any).user;
  const roles = (res as any).data?.roles ?? (res as any).roles ?? [];
  useTokenStore.getState().setToken(token);
  return { token, user, roles } as const;
}

// Productos mutations
export function useCreateProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.productos.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.productos }); },
  });
}
export function useUpdateProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Producto> }) => services.productos.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.productos }); },
  });
}

// Areas hooks
export function useAreas() {
  return useQuery({ queryKey: keys.areas, queryFn: services.areas.list });
}

export function useCreateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.areas.create,
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: keys.areas }); 
      qc.invalidateQueries({ queryKey: keys.referencias }); 
    },
  });
}

export function useUpdateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Area> }) => services.areas.update(id, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: keys.areas }); 
      qc.invalidateQueries({ queryKey: keys.referencias }); 
    },
  });
}

export function useDeleteArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.areas.remove,
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: keys.areas }); 
      qc.invalidateQueries({ queryKey: keys.referencias }); 
    },
  });
}

// Ubicaciones hooks
export function useUbicaciones() {
  return useQuery({ queryKey: keys.ubicaciones, queryFn: services.ubicaciones.list });
}

export function useCreateUbicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.ubicaciones.create,
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: keys.ubicaciones }); 
      qc.invalidateQueries({ queryKey: keys.referencias }); 
    },
  });
}

export function useUpdateUbicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Ubicacion> }) => services.ubicaciones.update(id, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: keys.ubicaciones }); 
      qc.invalidateQueries({ queryKey: keys.referencias }); 
    },
  });
}

export function useDeleteUbicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.ubicaciones.remove,
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: keys.ubicaciones }); 
      qc.invalidateQueries({ queryKey: keys.referencias }); 
    },
  });
}

// Unidades de medida hooks
export function useUnidadesMedida() {
  return useQuery({ queryKey: keys.unidadesMedida, queryFn: services.unidadesMedida.list });
}

export function useCreateUnidadMedida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.unidadesMedida.create,
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: keys.unidadesMedida }); 
    },
  });
}

export function useUpdateUnidadMedida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => services.unidadesMedida.update(id, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: keys.unidadesMedida }); 
    },
  });
}

export function useDeleteUnidadMedida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: services.unidadesMedida.remove,
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: keys.unidadesMedida }); 
    },
  });
}

export function useRemoveProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => services.productos.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.productos }); },
  });
}
