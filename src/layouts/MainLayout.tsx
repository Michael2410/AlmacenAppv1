import { Layout } from "antd";
import SidebarNav from "../components/SidebarNav";
import Topbar from "../components/Topbar";
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/auth.store";
import { useTokenStore } from "../lib/api";
import StockAlertBadge from "../components/Stock/StockAlertBadge";
import ExpiringAlertBadge from "../components/Stock/ExpiringAlertBadge";
import LowStockModal from "../components/Stock/LowStockModal";
import ExpiringProductsModal from "../components/Stock/ExpiringProductsModal";

const { Sider, Header, Content } = Layout;

export default function MainLayout() {
  const token = useAuthStore((s) => s.token);
  const setToken = useTokenStore((s) => s.setToken);
  const has = useAuthStore((s) => s.hasPermission);
  const [lowStockModalOpen, setLowStockModalOpen] = useState(false);
  const [expiringModalOpen, setExpiringModalOpen] = useState(false);

  // Sincronizar token con interceptor
  useEffect(() => {
    if (token) setToken(token);
  }, [token, setToken]);

  // Permisos de inventario
  const canViewStock =
    has(["inventory.viewAll"]) ||
    has(["inventory.viewSelf"]) ||
    has(["products.view"]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* === SIDEBAR FIJO === */}
      <Sider
        collapsible
        width={230}
        style={{
          position: "fixed",
          height: "100vh",
          left: 0,
          top: 0,
          bottom: 0,
          overflowY: "auto",
          background: "#001529",
          color: "white",
          zIndex: 100,
        }}
      >
        <div className="text-white text-center py-4 font-semibold text-lg border-b border-gray-700">
          StokUp
        </div>

        <SidebarNav />

        {/* Alerta de Stock Bajo */}
        {canViewStock && (
          <div style={{ marginTop: "auto", padding: "16px" }}>
            <StockAlertBadge onClick={() => setLowStockModalOpen(true)} />
            <ExpiringAlertBadge onClick={() => setExpiringModalOpen(true)} />
          </div>
        )}
      </Sider>

      {/* === ÁREA PRINCIPAL === */}
      <Layout
        style={{
          marginLeft: 230, // mismo ancho del Sider
          minHeight: "100vh",
          background: "#f5f5f5",
        }}
      >
        {/* === TOPBAR FIJO === */}
        <Header
          style={{
            position: "fixed",
            top: 0,
            left: 230, // alinear con sidebar
            right: 0,
            height: 64,
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            zIndex: 99,
            padding: 0,
          }}
        >
          <Topbar />
        </Header>

        {/* === CONTENIDO SCROLLEABLE === */}
        <Content
          style={{
            marginTop: 64, // altura del topbar
            padding: "24px",
            overflowY: "auto",
            height: "calc(100vh - 64px)",
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* === MODALES === */}
      <LowStockModal
        open={lowStockModalOpen}
        onClose={() => setLowStockModalOpen(false)}
      />
      <ExpiringProductsModal
        open={expiringModalOpen}
        onClose={() => setExpiringModalOpen(false)}
      />
    </Layout>
  );
}
