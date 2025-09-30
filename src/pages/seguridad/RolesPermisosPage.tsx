import { Checkbox, Table } from 'antd';
import type { Permission } from '../../types/seguridad';
import { useRolesStore } from '../../store/roles.store';

const allPerms: Permission[] = [
  'users.manage','roles.manage','providers.view','providers.create','providers.update','providers.delete','products.view','products.create','products.update','products.delete','ingresos.view','ingresos.create','ingresos.update','ingresos.delete','inventory.viewSelf','inventory.viewAll','inventory.assign','reports.view','reports.export'
];

export default function RolesPermisosPage() {
  const roles = useRolesStore(s => s.roles);
  const updateRole = useRolesStore(s => s.updateRole);
  const toggle = (roleId: string, perm: Permission, checked: boolean) => {
    const role = roles.find(r => r.id === roleId)!;
    const perms = new Set(role.permissions);
    if (checked) perms.add(perm); else perms.delete(perm);
    updateRole(roleId, { permissions: Array.from(perms) });
  };
  return (
    <Table rowKey="id" dataSource={roles} pagination={false} columns={[
      { title: 'Rol', dataIndex: 'name' },
      { title: 'Permisos', render: (_, r) => (
        <div className="grid grid-cols-2 gap-2">
          {allPerms.map(p => (
            <label key={p} className="flex items-center gap-2">
              <Checkbox checked={r.permissions.includes(p)} onChange={(e) => toggle(r.id, p, e.target.checked)} />{p}
            </label>
          ))}
        </div>
      )},
    ]} />
  );
}
