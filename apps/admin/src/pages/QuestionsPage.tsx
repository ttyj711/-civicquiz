import { useState } from 'react'
import { App, Button, Card, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import { ImportOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteQuestion, fetchBanks, fetchCategories, fetchQuestions } from '../api'
import type { Question } from '../api/types'
import { TYPE_COLOR, TYPE_LABEL } from '../constants'
import QuestionFormModal from '../components/QuestionFormModal'
import ImportModal from '../components/ImportModal'

export default function QuestionsPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{ bankId?: number; categoryId?: number; type?: string; keyword?: string }>({})
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Question | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const { data: banks } = useQuery({ queryKey: ['banks'], queryFn: fetchBanks })
  const { data: cats } = useQuery({ queryKey: ['admin-categories'], queryFn: fetchCategories })
  const { data, isLoading } = useQuery({
    queryKey: ['questions', page, filters],
    queryFn: () => fetchQuestions({ page, size: 20, ...filters }),
  })

  // 新增/编辑在 QuestionFormModal 内部处理，这里只管删除
  const del = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      message.success('已删除(软删)')
      qc.invalidateQueries({ queryKey: ['questions'] })
      qc.invalidateQueries({ queryKey: ['banks'] })
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
    },
    onError: (e) => message.error((e as Error).message),
  })

  const openEditor = (row?: Question) => {
    setEditing(row ?? null)
    setOpen(true)
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    {
      title: '题型', dataIndex: 'type', width: 80,
      render: (v: string) => <Tag color={TYPE_COLOR[v]}>{TYPE_LABEL[v]}</Tag>,
    },
    {
      title: '题目', dataIndex: 'content',
      render: (v: string) => <Typography.Text ellipsis style={{ maxWidth: 340 }}>{v}</Typography.Text>,
    },
    { title: '题库', dataIndex: 'bankName', width: 150, ellipsis: true },
    { title: '分类', dataIndex: 'categoryName', width: 130, ellipsis: true, render: (v: string | null) => v ?? '-' },
    { title: '难度', dataIndex: 'difficulty', width: 90, render: (v: number) => (v ? '★'.repeat(v) : '-') },
    { title: '分值', dataIndex: 'score', width: 70, render: (v: string | number) => Number(v) },
    {
      title: '答案', dataIndex: 'answerKeys', width: 100,
      render: (v: string[]) => (v?.length ? <Tag color="green">{v.join('')}</Tag> : '-'),
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: number) => (v === 1 ? <Tag color="success">启用</Tag> : <Tag color="default">停用</Tag>),
    },
    {
      title: '操作', width: 160, fixed: 'right' as const,
      render: (_: unknown, row: Question) => (
        <Space>
          <Button size="small" onClick={() => openEditor(row)}>编辑</Button>
          <Popconfirm title="确认删除该题？" onConfirm={() => del.mutate(row.id, { onSuccess: () => message.success('已删除(软删)') })}>
            <Button size="small" danger loading={del.isPending && del.variables === row.id}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="题目管理"
      extra={
        <Space>
          <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>批量导入</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>新增题目</Button>
        </Space>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Select allowClear placeholder="题库" style={{ width: 180 }} value={filters.bankId}
          onChange={(bankId) => { setPage(1); setFilters({ ...filters, bankId, categoryId: undefined }) }}
          options={(banks ?? []).map((b) => ({ value: b.id, label: b.name }))} />
        <Select allowClear placeholder="分类" style={{ width: 180 }} value={filters.categoryId}
          onChange={(categoryId) => { setPage(1); setFilters({ ...filters, categoryId }) }}
          options={(cats ?? []).filter((c) => !filters.bankId || c.bankId === filters.bankId)
            .map((c) => ({ value: c.id, label: c.name }))} />
        <Select allowClear placeholder="题型" style={{ width: 120 }} value={filters.type}
          onChange={(type) => { setPage(1); setFilters({ ...filters, type }) }}
          options={Object.entries(TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
        <Input.Search placeholder="题干搜索" allowClear style={{ width: 220 }}
          onSearch={(keyword) => { setPage(1); setFilters({ ...filters, keyword }) }} />
      </Space>

      <Table rowKey="id" loading={isLoading} dataSource={data?.items ?? []} columns={columns} size="middle"
        scroll={{ x: 1200 }}
        pagination={{ current: page, pageSize: 20, total: data?.total ?? 0, showTotal: (t) => `共 ${t} 题`, onChange: setPage }} />

      <QuestionFormModal open={open} editing={editing} banks={banks ?? []} cats={cats ?? []}
        onClose={() => setOpen(false)} />
      <ImportModal open={importOpen} banks={banks ?? []} defaultBankId={filters.bankId}
        onClose={() => setImportOpen(false)} />
    </Card>
  )
}
