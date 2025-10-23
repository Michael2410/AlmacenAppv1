import { useState } from 'react';
import { Card, Form, Input, Button, Upload, Image, Space, Typography, Spin, Alert } from 'antd';
import { UploadOutlined, SaveOutlined } from '@ant-design/icons';
import { useEmpresaConfig, useUpdateEmpresaConfig, useUploadLogo } from '../../hooks/useEmpresaConfig';

const { Title, Text } = Typography;

export default function EmpresaPage() {
  const [form] = Form.useForm();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const { data: config, isLoading } = useEmpresaConfig();
  const updateConfig = useUpdateEmpresaConfig();
  const uploadLogo = useUploadLogo();

  const handleSubmit = async (values: any) => {
    await updateConfig.mutateAsync(values);
  };

  const handleLogoChange = (info: any) => {
    const file = info.file.originFileObj || info.file;
    
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setLogoPreview(base64);
        await uploadLogo.mutateAsync(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      alert('Solo se permiten archivos de imagen');
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      alert('La imagen debe ser menor a 2MB');
      return false;
    }
    return false; // Prevenir upload automático
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Title level={2}>Configuración de Empresa</Title>
      <Text type="secondary" className="block mb-6">
        Configure los datos de su empresa que aparecerán en las cotizaciones y documentos
      </Text>

      <Alert
        message="Información"
        description="Ingresar los datos de su empresa."
        type="info"
        showIcon
        className="mb-6"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo */}
        <Card title="Logo de Empresa" className="lg:col-span-1">
          <div className="flex flex-col items-center gap-4">
            {(logoPreview || config?.logo_path) && (
              <Image
                src={logoPreview || config?.logo_path || ''}
                alt="Logo de empresa"
                style={{ maxWidth: '200px', maxHeight: '200px' }}
                preview={false}
              />
            )}
            
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={beforeUpload}
              onChange={handleLogoChange}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />} loading={uploadLogo.isPending}>
                {config?.logo_path ? 'Cambiar Logo' : 'Subir Logo'}
              </Button>
            </Upload>

            <Text type="secondary" className="text-xs text-center">
              Formatos: PNG, JPG, JPEG<br />
              Tamaño máximo: 2MB<br />
              Recomendado: 400x400px
            </Text>
          </div>
        </Card>

        {/* Formulario de datos */}
        <Card title="Datos de la Empresa" className="lg:col-span-2">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              nombre_empresa: config?.nombre_empresa || '',
              ruc: config?.ruc || '',
              direccion: config?.direccion || '',
              telefono: config?.telefono || '',
              email: config?.email || ''
            }}
          >
            <Form.Item
              label="Nombre de Empresa"
              name="nombre_empresa"
              rules={[{ required: true, message: 'El nombre es requerido' }]}
            >
              <Input placeholder="Ej: Mi Empresa S.A.C." size="large" />
            </Form.Item>

            <Form.Item
              label="RUC"
              name="ruc"
              rules={[
                { required: true, message: 'El RUC es requerido' },
                { len: 11, message: 'El RUC debe tener 11 dígitos' }
              ]}
            >
              <Input placeholder="12345678901" maxLength={11} size="large" />
            </Form.Item>

            <Form.Item
              label="Dirección"
              name="direccion"
            >
              <Input.TextArea 
                placeholder="Av. Principal 123, Lima - Perú" 
                rows={2}
              />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Teléfono"
                name="telefono"
              >
                <Input placeholder="(01) 123-4567" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[{ type: 'email', message: 'Email inválido' }]}
              >
                <Input placeholder="contacto@empresa.com" />
              </Form.Item>
            </div>

            <Form.Item className="mb-0">
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<SaveOutlined />}
                  loading={updateConfig.isPending}
                  size="large"
                >
                  Guardar Cambios
                </Button>
                <Button 
                  onClick={() => form.resetFields()}
                  disabled={updateConfig.isPending}
                  size="large"
                >
                  Cancelar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
