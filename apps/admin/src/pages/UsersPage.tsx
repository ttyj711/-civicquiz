import { useState } from 'react'
import { Card, Input, Table, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { fetchUsers } from '../api'
import { formatTime } from '../utils'

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, keyword],
    queryFn: () => fetchUsers({ page, size: 20, keyword }),
  })

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '昵称', dataIndex: 'nickname', width: 180 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: number) => (v === 1 ? <Tag color="green">正常</Tag> : <Tag color="red">禁用</Tag>),
    },
    { title: '累计答题', dataIndex: 'answered', width: 100 },
    { title: '正确率', dataIndex: 'accuracy', width: 90, render: (v: number) => `${v}%` },
    { title: '考试次数', dataIndex: 'exams', width: 90 },
    {
      title: '最近登录', dataIndex: 'lastLoginAt', width: 170,
      render: (v: string | null) => <Typography.Text type="secondary" style={{ fontSize: 12 }}>{formatTime(v)}</Typography.Text>,
    },
    { title: '注册时间', dataIndex: 'createdAt', width: 170, render: (v: string) => formatTime(v) },
  ]

  return (
    <Card title="用户管理">
      <Input.Search placeholder="昵称 / openid 搜索" allowClear style={{ width: 260, marginBottom: 16 }}
        onSearch={(v) => { setPage(1); setKeyword(v) }} />
      <Table rowKey="id" loading={isLoading} dataSource={data?.items ?? []} columns={columns} size="middle" scroll={{ x: 980 }}
        pagination={{ current: page, pageSize: 20, total: data?.total ?? 0, showTotal: (t) => `共 ${t} 人`, onChange: setPage }} />
    </Card>
  )
}
