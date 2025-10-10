import React, { useState } from 'react';
import { Button, Modal, message } from 'antd';
import { useAuthStore } from '../../store/auth.store';
import AuthDebugComponent from '../../components/debug/AuthDebugComponent';

const TestPage: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const user = useAuthStore(s => s.user);
  const hasPermission = useAuthStore(s => s.hasPermission);

  const handleButtonClick = () => {
    console.log('Botón clickeado');
    message.info('Botón funcionando correctamente');
    setModalVisible(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Página de Prueba</h1>
      <p>Usuario: {user?.email || 'No logueado'}</p>
      <p>Rol: {user?.roleId || 'Sin rol'}</p>
      <p>Permiso pedidos.create: {hasPermission('pedidos.create') ? 'SÍ' : 'NO'}</p>
      
      <Button 
        type="primary" 
        onClick={handleButtonClick}
        size="large"
      >
        Abrir Modal de Prueba
      </Button>

      <Modal
        title="Modal de Prueba"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <p>Modal funcionando correctamente</p>
        <Button onClick={() => setModalVisible(false)}>
          Cerrar
        </Button>
      </Modal>
      
      <AuthDebugComponent />
    </div>
  );
};

export default TestPage;
