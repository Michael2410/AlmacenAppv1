import { Segmented } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import MiInventarioPage from './MiInventarioPage';
import AlmacenGeneralPage from './AlmacenGeneralPage';
import { useSearchParams } from 'react-router-dom';

export default function InventarioPage() {
  const hasPermission = useAuthStore(s => s.hasPermission);
  const isAdmin = hasPermission(['inventory.viewAll']);
  const [sp, setSp] = useSearchParams();
  const initialView = useMemo<'mio' | 'general'>(() => {
    const v = sp.get('view');
    if (isAdmin && (v === 'mio' || v === 'general')) return v;
    return isAdmin ? 'general' : 'mio';
  }, [sp, isAdmin]);
  const [view, setView] = useState<'mio' | 'general'>(initialView);
  useEffect(() => { setView(initialView); }, [initialView]);
  const showSwitcher = isAdmin;
  
  // Para usuarios sin permisos de ver todo, mostrar solo su inventario
  if (!isAdmin) {
    return <MiInventarioPage />;
  }
  
  return (
    <div className="space-y-3">
      {showSwitcher && (
        <Segmented
          options={[{ label: 'Almacén General', value: 'general' }, { label: 'Mi Inventario', value: 'mio' }]}
          value={view}
          onChange={(val) => { setView(val as any); setSp(prev => { const p = new URLSearchParams(prev); p.set('view', String(val)); return p; }); }}
        />
      )}
      {view === 'mio' && <MiInventarioPage />}
      {view === 'general' && <AlmacenGeneralPage />}
    </div>
  );
}
