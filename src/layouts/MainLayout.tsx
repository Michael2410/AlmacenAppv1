import { Layout } from 'antd';
import SidebarNav from '../components/SidebarNav';
import Topbar from '../components/Topbar';
import { Outlet } from 'react-router-dom';

const { Sider, Header, Content } = Layout;

export default function MainLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div className="text-white text-center py-4 font-semibold">Almacén</div>
        <SidebarNav />
      </Sider>
      <Layout>
        <Header className="bg-white">
          <Topbar />
        </Header>
        <Content className="p-4">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
