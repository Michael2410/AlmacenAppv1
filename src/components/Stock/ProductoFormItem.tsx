import { Row, Col, Form, Button } from 'antd';
import { StockAvailableAlert } from './StockAvailableAlert';
import { useStockDisponible } from '../../hooks/useStockDisponible';

interface ProductoFormItemProps {
  field: any;
  productos: any[];
  onRemove: () => void;
  form: any;
  showLabel: boolean;
}

export function ProductoFormItem({ field, productos, onRemove, form, showLabel }: ProductoFormItemProps) {
  // Observar los valores actuales del formulario para este item
  const items = Form.useWatch('items', form) || [];
  const currentItem = items[field.name] || {};
  const productoId = currentItem.productoId;
  const cantidad = Number(currentItem.cantidad) || 0;
  
  // Obtener info del producto seleccionado
  const productoSeleccionado = productos.find(p => p.id === productoId);
  const marca = productoSeleccionado?.marca;

  // Consultar stock disponible
  const { data: stockDisponible } = useStockDisponible(productoId, marca);
  
  // Determinar si el pedido es válido
  return (
    <div style={{ marginBottom: 16, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa' }}>
      <Row gutter={12}>
        <Col span={14}>
          <Form.Item
            {...field}
            name={[field.name, 'productoId']}
            rules={[{ required: true, message: 'Selecciona un producto' }]}
            label={showLabel ? 'Producto' : undefined}
          >
            <select 
              title="Selecciona un producto"
              aria-label="Producto"
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                fontSize: '14px'
              }}
              onChange={(e) => {
                // Reset cantidad al cambiar producto
                const currentItems = form.getFieldValue('items');
                currentItems[field.name] = {
                  ...currentItems[field.name],
                  productoId: e.target.value,
                  cantidad: ''
                };
                form.setFieldsValue({ items: currentItems });
              }}
            >
              <option value="">Selecciona un producto...</option>
              {productos.map(producto => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre} - {producto.marca || 'Sin marca'} ({producto.unidad || 'UNIDAD'})
                </option>
              ))}
            </select>
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            {...field}
            name={[field.name, 'cantidad']}
            rules={[
              { required: true, message: 'Ingresa la cantidad' },
              { pattern: /^[1-9]\d*$/, message: 'Debe ser un número positivo' },
              () => ({
                validator(_, value) {
                  if (!value || !productoId) return Promise.resolve();
                  const cant = Number(value);
                  if (stockDisponible !== undefined && cant > stockDisponible) {
                    return Promise.reject(new Error(`Stock insuficiente (disponible: ${stockDisponible})`));
                  }
                  return Promise.resolve();
                },
              })
            ]}
            label={showLabel ? 'Cantidad' : undefined}
          >
            <input 
              type="number" 
              min="1" 
              placeholder="Cantidad"
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </Form.Item>
        </Col>
        <Col span={4} style={{ display: 'flex', alignItems: showLabel ? 'end' : 'center' }}>
          <Button danger onClick={onRemove} size="middle">
            Eliminar
          </Button>
        </Col>
      </Row>

      {/* Alerta de stock disponible */}
      {productoId && cantidad > 0 && (
        <StockAvailableAlert
          productoId={productoId}
          marca={marca}
          cantidadSolicitada={cantidad}
          className="mt-2"
        />
      )}
    </div>
  );
}
