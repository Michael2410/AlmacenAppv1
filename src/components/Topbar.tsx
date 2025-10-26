import { Button, Flex, Typography, Avatar } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../store/auth.store";
import { useNavigate } from "react-router-dom";
import { useTokenStore } from "../lib/api";

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const setToken = useTokenStore((s) => s.setToken);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setToken(null);
    navigate("/login", { replace: true });
  };

  return (
    <Flex
      align="center"
      justify="space-between"
      className="px-6 bg-white border-b border-gray-200 shadow-sm"
      style={{
        height: 64,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* === Branding === */}
      <Typography.Title
        level={4}
        style={{
          margin: 0,
          color: "#1677ff",
          fontWeight: 700,
          letterSpacing: "0.3px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
        }}
        onClick={() => navigate("/")}
      >
        <span style={{ color: "#1677ff" }}>Stok</span>
        <span style={{ color: "#001529" }}>Up</span>
      </Typography.Title>

      {/* === Usuario === */}
      {user ? (
        <Flex align="center" gap={12}>
          <Flex align="center" gap={8} style={{ lineHeight: 1 }}>
            <Avatar
              size={38}
              icon={<UserOutlined />}
              style={{
                backgroundColor: "#1677ff",
                color: "#fff",
                fontSize: 18,
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            />
            <div>
              <Typography.Text
                style={{
                  fontWeight: 600,
                  fontSize: 13.5,
                  display: "block",
                  marginBottom: 2,
                }}
              >
                {user.nombres}
              </Typography.Text>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 11.5, lineHeight: 1 }}
              >
                Administrador
              </Typography.Text>
            </div>
          </Flex>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            Salir
          </Button>
        </Flex>
      ) : (
        <Button
          type="primary"
          icon={<LoginOutlined />}
          onClick={() => navigate("/login")}
        >
          Iniciar sesión
        </Button>
      )}
    </Flex>
  );
}
