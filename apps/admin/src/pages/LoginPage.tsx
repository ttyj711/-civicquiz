import { useState } from 'react'
import { Button, Card, Form, Input, Typography, App } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'
import { useAuth } from '../auth'
import { BRAND_GRADIENT, BRAND_SHADOW } from '../theme'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { message } = App.useApp()
  const nav = useNavigate()
  const { login: saveAuth } = useAuth()

  const onFinish = async (v: { username: string; password: string }) => {
    setLoading(true)
    try {
      const r = await login(v.username, v.password)
      saveAuth(r.admin, r.token)
      message.success('登录成功')
      nav('/dashboard')
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg,#0a1f44 0%,#1348a0 55%,#1677ff 100%)',
        position: 'relative', overflow: 'hidden', padding: 24,
      }}
    >
      {/* 装饰光斑：营造层次感，不参与交互 */}
      <div aria-hidden style={{
        position: 'absolute', width: 420, height: 420, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(105,177,255,.35), transparent 70%)',
        top: -120, right: -80,
      }} />
      <div aria-hidden style={{
        position: 'absolute', width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(22,119,255,.28), transparent 70%)',
        bottom: -100, left: -60,
      }} />

      <Card
        style={{ width: 400, borderRadius: 16, border: '1px solid rgba(255,255,255,.6)', boxShadow: '0 16px 48px rgba(6,25,60,.35)' }}
        styles={{ body: { padding: '36px 32px 28px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
              background: BRAND_GRADIENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 24,
              boxShadow: BRAND_SHADOW,
            }}
          >
            刷
          </div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>刷题管理后台</Typography.Title>
          <Typography.Text type="secondary">题库 · 题目 · 考试 · 统计</Typography.Text>
        </div>

        <Form onFinish={onFinish} size="large" initialValues={{ username: 'admin', password: '' }}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined style={{ color: '#b8bcc4' }} />} placeholder="用户名" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#b8bcc4' }} />} placeholder="密码" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} style={{ marginTop: 8, height: 44, fontWeight: 600 }}>
            登 录
          </Button>
        </Form>

        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginTop: 18, marginBottom: 0, fontSize: 12 }}>
          演示账号：admin / admin123
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
