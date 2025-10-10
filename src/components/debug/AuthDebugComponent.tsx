import React from 'react';
import { useAuthStore } from '../../store/auth.store';

const AuthDebugComponent: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const roles = useAuthStore(s => s.roles);
  const token = useAuthStore(s => s.token);
  const hasPermission = useAuthStore(s => s.hasPermission);

  return (
    <div style={{ padding: 20, border: '1px solid #ccc', margin: 10 }}>
      <h3>🔍 Auth Debug Info</h3>
      
      <div><strong>Token:</strong> {token ? 'Presente' : 'Ausente'}</div>
      <div><strong>Local Storage Token:</strong> {localStorage.getItem('token') ? 'Presente' : 'Ausente'}</div>
      
      <div><strong>Usuario:</strong></div>
      <pre>{JSON.stringify(user, null, 2)}</pre>
      
      <div><strong>Roles ({roles.length}):</strong></div>
      <pre>{JSON.stringify(roles, null, 2)}</pre>
      
      <div><strong>Permisos Específicos:</strong></div>
      <div>• pedidos.create: {hasPermission('pedidos.create') ? '✅' : '❌'}</div>
      <div>• inventory.viewSelf: {hasPermission('inventory.viewSelf') ? '✅' : '❌'}</div>
      <div>• users.manage: {hasPermission('users.manage') ? '✅' : '❌'}</div>
    </div>
  );
};

export default AuthDebugComponent;
