import IngresoForm from '../../components/forms/IngresoForm';
import { message } from 'antd';

export default function NuevoIngresoPage() {
  return (
    <div className="max-w-2xl">
      <IngresoForm onSuccess={() => message.success('Ingreso registrado')} />
    </div>
  );
}
