import { useState } from 'react'
import { Card, Select, Space, Table, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { fetchExamRecords, fetchExams } from '../api'
import { RECORD_STATUS } from '../constants'
import { formatTime } from '../utils'

export default function ExamRecordsPage() {
  const [examId, setExamId] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const { data: exams } = useQuery({ queryKey: ['exams'], queryFn: fetchExams })
  const { data, isLoading } = useQuery({
    queryKey: ['exam-records', examId, page],
    queryFn: () => fetchExamRecords({ examId, page, size: 20 }),
  })

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '考试', dataIndex: 'examName', width: 200, ellipsis: true },
    { title: '考生', dataIndex: 'nickname', width: 140 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: number) => { const s = RECORD_STATUS[v] ?? { c: 'default', t: String(v) }; return <Tag color={s.c}>{s.t}</Tag> },
    },
    { title: '得分', dataIndex: 'score', width: 90, render: (v: number | null) => (v === null ? '-' : Number(v)) },
    { title: '总分', dataIndex: 'totalScore', width: 80, render: (v: number | null) => (v === null ? '-' : Number(v)) },
    { title: '对/错/未答', width: 110, render: (_: unknown, r: { correctCount: number; wrongCount: number; unansweredCount: number }) => `${r.correctCount} / ${r.wrongCount} / ${r.unansweredCount}` },
    {
      title: '开始时间', dataIndex: 'startTime', width: 180,
      render: (v: string) => <Typography.Text type="secondary" style={{ fontSize: 12 }}>{formatTime(v)}</Typography.Text>,
    },
  ]

  return (
    <Card title="考试记录">
      <Space style={{ marginBottom: 16 }}>
        <Select allowClear placeholder="按考试筛选" style={{ width: 260 }} value={examId}
          onChange={(v) => { setExamId(v); setPage(1) }}
          options={(exams ?? []).map((e) => ({ value: e.id, label: e.name }))} />
      </Space>
      <Table rowKey="id" loading={isLoading} dataSource={data?.items ?? []} columns={columns} size="middle" scroll={{ x: 1000 }}
        pagination={{ current: page, pageSize: 20, total: data?.total ?? 0, showTotal: (t) => `共 ${t} 条`, onChange: setPage }} />
    </Card>
  )
}
