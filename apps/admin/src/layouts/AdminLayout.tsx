import { Layout, Menu, Typography, Avatar, Dropdown } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  DashboardOutlined, DatabaseOutlined, AppstoreOutlined, FileTextOutlined,
  ScheduleOutlined, TeamOutlined, LogoutOutlined, ProfileOutlined,
} from '@ant-design/icons'
import { useAuth } from '../auth'
import { BRAND_GRADIENT, BRAND_SHADOW } from '../theme'

const { Header, Sider, Content } = Layout

const MENU = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  {
    key: 'banks', icon: <DatabaseOutlined />, label: '题库管理', type: 'group' as const,
    children: [
      { key: '/banks', icon: <DatabaseOutlined />, label: '题库列表' },
      { key: '/categories', icon: <AppstoreOutlined />, label: '分类管理' },
      { key: '/questions', icon: <FileTextOutlined />, label: '题目管理' },
    ],
  },
  {
    key: 'exams', icon: <ScheduleOutlined />, label: '考试管理', type: 'group' as const,
    children: [
      { key: '/exams', icon: <ScheduleOutlined />, label: '考试列表' },
      { key: '/exam-records', icon: <ProfileOutlined />, label: '考试记录' },
    ],
  },
  { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
]

/** 路由 → 页面标题（顶栏展示） */
const TITLES: Record<string, string> = {
  '/dashboard': '工作台',
  '/banks': '题库列表',
  '/categories': '分类管理',
  '/questions': '题目管理',
  '/exams': '考试列表',
  '/exam-records': '考试记录',
  '/users': '用户管理',
}

export default function AdminLayout() {
  const nav = useNavigate()
  const loc = useLocation()
  const { user, logout } = useAuth()

  const selected = '/' + loc.pathname.split('/')[1]
  const openKey = ['/banks', '/categories', '/questions'].includes(selected) ? 'banks'
    : ['/exams', '/exam-records'].includes(selected) ? 'exams' : undefined

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="dark" breakpoint="lg" collapsedWidth={64}>
        {/* 品牌区：渐变 Logo 标 + 双行标题 */}
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 14px' }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: BRAND_GRADIENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 16,
              boxShadow: BRAND_SHADOW,
            }}
          >
            刷
          </div>
          <div style={{ lineHeight: 1.2, overflow: 'hidden' }}>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>刷题管理后台</div>
            <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, whiteSpace: 'nowrap' }}>Civic Quiz Admin</div>
          </div>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selected]}
          defaultOpenKeys={openKey ? [openKey] : undefined}
          items={MENU} onClick={(e) => nav(e.key)} />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff', padding: '0 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid #eef0f3',
        }}>
          <Typography.Text strong style={{ fontSize: 15 }}>{TITLES[selected] ?? '管理后台'}</Typography.Text>
          <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout }] }}>
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Avatar style={{ background: '#1677ff', marginRight: 8 }}>{user?.nickname?.[0] ?? '管'}</Avatar>
              <Typography.Text strong>{user?.nickname ?? user?.username}</Typography.Text>
            </span>
          </Dropdown>
        </Header>
        <Content style={{ margin: 20 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
