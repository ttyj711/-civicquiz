import { useMemo, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { createCategory, deleteCategory, fetchBanks, fetchCategories, updateCategory } from '../api'
import type { Category } from '../api/types'
import { useCrud } from '../hooks/useCrud'

/** 扁平分类表 + 树形弹层选择（二级场景够用） */
export default function CategoriesPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [bankFilter, setBankFilter] = useState<number | undefined>()
  const [form] = Form.useForm()

  const { data: banks } = useQuery({ queryKey: ['banks'], queryFn: fetchBanks })
  const { data: cats, isLoading } = useQuery({ queryKey: ['admin-categories'], queryFn: fetchCategories })

  const { save, del, toggle } = useCrud({
    create: createCategory,
    update: updateCategory,
    remove: deleteCategory,
    queryKeys: ['admin-categories'],
  })

  const list = useMemo(() => (cats ?? []).filter((c) => !bankFilter || c.bankId === bankFilter), [cats, bankFilter])

  // 预构建 Map，避免表格逐行 O(n) find
  const bankMap = useMemo(() => new Map((banks ?? []).map((b) => [b.id, b.name])), [banks])
  const catMap = useMemo(() => new Map((cats ?? []).map((c) => [`${c.bankId}-${c.id}`, c.name])), [cats])

  const openEdit = (row?: Category) => {
    setEditing(row ?? null)
    form.resetFields()
    if (row) form.setFieldsValue(row)
    else if (bankFilter) form.setFieldsValue({ bankId: bankFilter, parentId: 0 })
    setOpen(true)
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '题库', dataIndex: 'bankId', width: 110, render: (v: number) => bankMap.get(v) ?? v },
    { title: '分类名称', dataIndex: 'name' },
    {
      title: '父级', dataIndex: 'parentId', width: 130,
      render: (v: number, row: Category) =>
        v === 0 ? <Tag>顶级</Tag> : catMap.get(`${row.bankId}-${v}`) ?? v,
    },
    { title: '题目数', dataIndex: 'questionCount', width: 90 },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: number, row: Category) => (
        <Switch size="small" checked={v === 1} checkedChildren="启用" unCheckedChildren="禁用"
          onChange={(c) => toggle.mutate({ id: row.id, status: c ? 1 : 0 })} />
      ),
    },
    {
      title: '操作', width: 160, fixed: 'right' as const,
      render: (_: unknown, row: Category) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>编辑</Button>
          <Popconfirm title="确认删除？删除前需清空子分类与题目" onConfirm={() => del.mutate(row.id)} disabled={row.questionCount > 0}>
            <Button size="small" danger disabled={row.questionCount > 0}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="分类管理"
      extra={
        <Space>
          <Select allowClear placeholder="按题库筛选" style={{ width: 200 }} value={bankFilter}
            onChange={setBankFilter}
            options={(banks ?? []).map((b) => ({ value: b.id, label: b.name }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>新增分类</Button>
        </Space>
      }
    >
      <Table rowKey="id" loading={isLoading} dataSource={list} columns={columns} scroll={{ x: 900 }}
        pagination={{ pageSize: 10, hideOnSinglePage: true, showTotal: (t) => `共 ${t} 个分类` }} />

      <Modal title={editing ? '编辑分类' : '新增分类'} open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={save.isPending} destroyOnHidden>
        <Form form={form} layout="vertical"
          onFinish={(v) => save.mutate({ editing, values: v }, { onSuccess: () => setOpen(false) })}
          initialValues={{ parentId: 0, sort: 0 }}>
          <Form.Item name="bankId" label="所属题库" rules={[{ required: true, message: '请选择题库' }]}>
            <Select options={(banks ?? []).map((b) => ({ value: b.id, label: b.name }))} placeholder="选择题库" />
          </Form.Item>
          <Form.Item name="parentId" label="父分类">
            <Select allowClear
              options={(cats ?? [])
                .filter((c) => !form.getFieldValue('bankId') || c.bankId === form.getFieldValue('bankId'))
                .filter((c) => !editing || c.id !== editing.id)
                .map((c) => ({ value: c.id, label: c.name }))}
              placeholder="不选则为顶级分类" />
          </Form.Item>
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：2026时政" />
          </Form.Item>
          <Form.Item name="sort" label="排序"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
