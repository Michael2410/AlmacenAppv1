import { Segmented } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import MiInventarioPage from './MiInventarioPage';
import AlmacenGeneralPage from './AlmacenGeneralPage';
import { useSearchParams } from 'react-router-dom';

export default function InventarioPage() {
  const isAdmin = useAuthStore(s => s.user?.roleId === 'role-encargado');
  const [sp, setSp] = useSearchParams();
  const initialView = useMemo<'mio' | 'general'>(() => {
    const v = sp.get('view');
    if (isAdmin && (v === 'mio' || v === 'general')) return v;
    return isAdmin ? 'general' : 'mio';
  }, [sp, isAdmin]);
  const [view, setView] = useState<'mio' | 'general'>(initialView);
  useEffect(() => { setView(initialView); }, [initialView]);
  const showSwitcher = isAdmin;
  return (
    <div className="space-y-3">
      {showSwitcher && (
        <Segmented
          options={[{ label: 'Almacén General', value: 'general' }, { label: 'Mi Inventario', value: 'mio' }]}
          value={view}
          onChange={(val) => { setView(val as any); setSp(prev => { const p = new URLSearchParams(prev); p.set('view', String(val)); return p; }); }}
        />
      )}
      {(!showSwitcher || view === 'mio') && <MiInventarioPage />}
      {showSwitcher && view === 'general' && <AlmacenGeneralPage />}
    </div>
  );
}
