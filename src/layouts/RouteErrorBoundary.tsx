import { Button } from 'antd';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';

export default function RouteErrorBoundary() {
  const err = useRouteError();
  const navigate = useNavigate();
  let title = 'Ocurrió un error';
  let message = 'Algo salió mal.';
  if (isRouteErrorResponse(err)) {
    title = `Error ${err.status}`;
    message = err.statusText || message;
  } else if (err instanceof Error) {
    message = err.message;
  }
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-xl text-gray-600">{message}</p>
      <div className="mt-2 flex gap-2">
        <Button onClick={() => navigate(0)}>Reintentar</Button>
        <Button type="primary" onClick={() => navigate('/dashboard')}>Ir al Dashboard</Button>
      </div>
    </div>
  );
}
