import { Card, Col, Row, Table, Tag, Typography } from 'antd'
import {
  TeamOutlined, DatabaseOutlined, FileTextOutlined, EditOutlined, CalendarOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../api'

/** 统计卡配色：底色浅色调 + 图标主题色，保持界面安静、数字突出 */
const STAT_STYLE = [
  { icon: <TeamOutlined />, bg: 'rgba(22,119,255,.10)', color: '#1677ff' },
  { icon: <DatabaseOutlined />, bg: 'rgba(22,163,74,.10)', color: '#16a34a' },
  { icon: <FileTextOutlined />, bg: 'rgba(245,158,11,.12)', color: '#d97706' },
  { icon: <EditOutlined />, bg: 'rgba(124,58,237,.10)', color: '#7c3aed' },
  { icon: <CalendarOutlined />, bg: 'rgba(220,38,38,.08)', color: '#dc2626' },
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: fetchStats })

  const cards = [
    { title: '用户总数', value: data?.users ?? 0 },
    { title: '题库数量', value: data?.banks ?? 0 },
    { title: '题目总数', value: data?.questions ?? 0 },
    { title: '今日答题', value: data?.todayAnswers ?? 0 },
    { title: '今日考试', value: data?.todayExams ?? 0 },
  ]

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          {greeting()}，{data?.users ?? 0} 名学员正在备考
        </Typography.Title>
        <Typography.Text type="secondary">{today} · 平台运行数据概览</Typography.Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {cards.map((c, i) => {
          const s = STAT_STYLE[i % STAT_STYLE.length]
          return (
            <Col xs={12} md={8} lg={4} key={c.title}>
              <Card styles={{ body: { padding: '18px 20px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                      background: s.bg, color: s.color, fontSize: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    aria-hidden
                  >
                    {s.icon}
                  </div>
                  {/* 标题禁止换行，窄卡不折行 */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#6b7280', fontSize: 13, whiteSpace: 'nowrap' }}>{c.title}</div>
                    <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>
                      {c.value}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      <Card
        title="错误率最高题目 Top10"
        loading={isLoading}
        styles={{ header: { borderBottom: '1px solid #f0f1f3' } }}
      >
        <Table
          rowKey="questionId"
          size="middle"
          pagination={false}
          dataSource={data?.topWrong ?? []}
          columns={[
            { title: '题库', dataIndex: 'bankName', width: 160 },
            {
              title: '题目', dataIndex: 'content', ellipsis: true,
              render: (v: string) => <Typography.Text ellipsis style={{ maxWidth: 420 }}>{v}</Typography.Text>,
            },
            { title: '作答次数', dataIndex: 'attempts', width: 100 },
            { title: '答错次数', dataIndex: 'wrong', width: 100 },
            {
              title: '错误率', dataIndex: 'wrongRate', width: 130,
              render: (v: number) => <Tag color={v >= 60 ? 'red' : v >= 30 ? 'orange' : 'green'}>{v}%</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  )
}
