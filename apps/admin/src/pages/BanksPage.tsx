import { useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { createBank, deleteBank, fetchBanks, updateBank } from '../api'
import type { Bank } from '../api/types'
import { useCrud } from '../hooks/useCrud'

export default function BanksPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Bank | null>(null)
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({ queryKey: ['banks'], queryFn: fetchBanks })

  const { save, del, toggle } = useCrud({
    create: createBank,
    update: updateBank,
    remove: deleteBank,
    queryKeys: ['banks'],
  })

  const openEdit = (row?: Bank) => {
    setEditing(row ?? null)
    form.resetFields()
    if (row) form.setFieldsValue(row)
    setOpen(true)
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '题库名称', dataIndex: 'name' },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    { title: '题目数', dataIndex: 'questionCount', width: 90 },
    { title: '分类数', dataIndex: 'categoryCount', width: 90 },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: number, row: Bank) => (
        <Switch size="small" checked={v === 1} checkedChildren="启用" unCheckedChildren="禁用"
          onChange={(c) => toggle.mutate({ id: row.id, status: c ? 1 : 0 })} />
      ),
    },
    {
      title: '操作', width: 160, fixed: 'right' as const,
      render: (_: unknown, row: Bank) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => del.mutate(row.id)} disabled={row.questionCount > 0}
            description={row.questionCount > 0 ? '有题目不可删除' : ''}>
            <Button size="small" danger disabled={row.questionCount > 0}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="题库列表"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>新增题库</Button>}
    >
      <Table rowKey="id" loading={isLoading} dataSource={data ?? []} columns={columns} scroll={{ x: 900 }}
        pagination={{ pageSize: 10, hideOnSinglePage: true, showTotal: (t) => `共 ${t} 个题库` }} />

      <Modal title={editing ? '编辑题库' : '新增题库'} open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={save.isPending} destroyOnHidden>
        <Form form={form} layout="vertical"
          onFinish={(v) => save.mutate({ editing, values: { ...v, status: 1 } }, { onSuccess: () => setOpen(false) })}
          initialValues={{ sort: 0, status: 1 }}>
          <Form.Item name="name" label="题库名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：时政热点题库" />
          </Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="sort" label="排序" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
