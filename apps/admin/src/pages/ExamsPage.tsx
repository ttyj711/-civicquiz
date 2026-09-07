import { useEffect, useMemo, useState } from 'react'
import {
  App, Button, Card, Checkbox, Descriptions, Form, Input, InputNumber, List, Modal, Popconfirm, Radio, Select, Space, Table, Tag, Typography,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createExam, deleteExam, fetchBanks, fetchExamDetail, fetchExams, fetchQuestions, updateExam } from '../api'
import type { Exam, ExamDetail } from '../api/types'
import { EXAM_STATUS, TYPE_LABEL } from '../constants'

export default function ExamsPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<ExamDetail | null>(null)
  const [form] = Form.useForm()
  // 组卷方式：固定（手动挑题）/ 随机（按题型数量抽题）
  const [examMode, setExamMode] = useState<'FIXED' | 'RANDOM'>('FIXED')
  const [randomRule, setRandomRule] = useState<{ singleCount?: number; multipleCount?: number; judgeCount?: number; scorePer?: number }>({
    scorePer: 2,
  })

  const { data: banks } = useQuery({ queryKey: ['banks'], queryFn: fetchBanks })
  const { data: exams, isLoading } = useQuery({ queryKey: ['exams'], queryFn: fetchExams })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['exams'] })

  // 新建固定组卷：题库 + 挑题
  const bankId = form.getFieldValue('bankId')
  const [picker, setPicker] = useState<Record<number, number>>({}) // questionId -> score
  const [qkeyword, setQkeyword] = useState('')
  const { data: qData, isLoading: qLoading } = useQuery({
    queryKey: ['exam-picker', bankId, qkeyword],
    queryFn: () => fetchQuestions({ bankId, size: 500, keyword: qkeyword }),
    enabled: !!bankId,
  })

  useEffect(() => { if (open) setPicker({}) }, [open])

  const totalScore = useMemo(
    () => Object.values(picker).reduce((s, v) => s + Number(v || 0), 0),
    [picker]
  )

  const create = useMutation({
    mutationFn: (v: { bankId: number; name: string; description?: string; duration: number; status?: number }) => {
      if (examMode === 'RANDOM') {
        return createExam({
          ...v, examType: 'RANDOM',
          randomRule: {
            singleCount: randomRule.singleCount ?? 0,
            multipleCount: randomRule.multipleCount ?? 0,
            judgeCount: randomRule.judgeCount ?? 0,
            scorePer: randomRule.scorePer ?? 2,
          },
        })
      }
      return createExam({
        ...v, examType: 'FIXED',
        questions: Object.entries(picker).map(([qid, score]) => ({ questionId: Number(qid), score: Number(score || 0) })),
      })
    },
    onSuccess: () => { message.success('考试已创建'); setOpen(false); invalidate() },
    onError: (e) => message.error((e as Error).message),
  })

  const remove = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => { message.success('已删除'); invalidate() },
    onError: (e) => message.error((e as Error).message),
  })

  const toggleStatus = (row: Exam, status: number) =>
    updateExam(row.id, { status }).then(() => { message.success('已更新'); invalidate() })

  const viewDetail = async (id: number) => {
    const d = await fetchExamDetail(id)
    setDetail(d)
    setDetailOpen(true)
  }

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ duration: 60 })
    setExamMode('FIXED')
    setRandomRule({ scorePer: 2 })
    setOpen(true)
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '考试名称', dataIndex: 'name' },
    { title: '题库', dataIndex: 'bankName', width: 140 },
    { title: '题数', dataIndex: 'questionCount', width: 70 },
    { title: '总分', dataIndex: 'totalScore', width: 80, render: (v: string | number) => Number(v) },
    { title: '时长(分)', dataIndex: 'duration', width: 90 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: number) => {
        const s = EXAM_STATUS[v] ?? { c: 'default', t: String(v) }
        return <Tag color={s.c}>{s.t}</Tag>
      },
    },
    {
      title: '操作', width: 240,
      render: (_: unknown, row: Exam) => (
        <Space wrap>
          <Button size="small" onClick={() => viewDetail(row.id)}>试卷</Button>
          {row.status === 1
            ? <Button size="small" onClick={() => toggleStatus(row, 2)}>下架</Button>
            : <Button size="small" type="primary" ghost onClick={() => toggleStatus(row, 1)}>发布</Button>}
          <Popconfirm title="删除考试？已有考生记录将禁止删除" onConfirm={() => remove.mutate(row.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card title="考试管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>创建考试</Button>}>
      <Table rowKey="id" loading={isLoading} dataSource={exams ?? []} columns={columns} scroll={{ x: 960 }}
        pagination={{ pageSize: 10, hideOnSinglePage: true, showTotal: (t) => `共 ${t} 场考试` }} />

      {/* 创建考试（固定 / 随机组卷） */}
      <Modal title="创建考试" open={open} width={860} onCancel={() => setOpen(false)}
        onOk={() => {
          form.validateFields().then((v) => {
            if (examMode === 'RANDOM') {
              const n = (randomRule.singleCount ?? 0) + (randomRule.multipleCount ?? 0) + (randomRule.judgeCount ?? 0)
              if (n <= 0) { message.error('请至少设置一种题型的抽取数量'); return }
            } else if (Object.keys(picker).length === 0) {
              message.error('请至少选择一道题'); return
            }
            create.mutate(v)
          }).catch(() => {})
        }} confirmLoading={create.isPending} destroyOnHidden>
        <Form form={form} layout="vertical">
          <Space align="start" wrap>
            <Form.Item name="name" label="考试名称" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 260 }} placeholder="如：时政模拟考试" />
            </Form.Item>
            <Form.Item name="bankId" label="题库" rules={[{ required: true, message: '必选' }]}>
              <Select style={{ width: 180 }} options={(banks ?? []).map((b) => ({ value: b.id, label: b.name }))} />
            </Form.Item>
            <Form.Item name="duration" label="时长(分钟)" rules={[{ required: true }]}>
              <InputNumber min={5} max={300} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="说明"><Input placeholder="考试说明（选填）" /></Form.Item>
          <Form.Item label="组卷方式">
            <Radio.Group value={examMode} onChange={(e) => setExamMode(e.target.value)}>
              <Radio.Button value="FIXED">固定组卷</Radio.Button>
              <Radio.Button value="RANDOM">随机组卷</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Form>

        {examMode === 'RANDOM' && (
          <>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
              保存时从题库随机抽取题目并固化为试卷快照，判分与固定组卷一致。数量不能超过题库可用题数。
            </Typography.Paragraph>
            <Space align="start" wrap>
              <div>
                <Typography.Text type="secondary">单选数量</Typography.Text>
                <div><InputNumber min={0} max={200} value={randomRule.singleCount} style={{ width: 110 }}
                  onChange={(v) => setRandomRule({ ...randomRule, singleCount: v ?? 0 })} /></div>
              </div>
              <div>
                <Typography.Text type="secondary">多选数量</Typography.Text>
                <div><InputNumber min={0} max={200} value={randomRule.multipleCount} style={{ width: 110 }}
                  onChange={(v) => setRandomRule({ ...randomRule, multipleCount: v ?? 0 })} /></div>
              </div>
              <div>
                <Typography.Text type="secondary">判断数量</Typography.Text>
                <div><InputNumber min={0} max={200} value={randomRule.judgeCount} style={{ width: 110 }}
                  onChange={(v) => setRandomRule({ ...randomRule, judgeCount: v ?? 0 })} /></div>
              </div>
              <div>
                <Typography.Text type="secondary">每题分值</Typography.Text>
                <div><InputNumber min={1} max={20} value={randomRule.scorePer} style={{ width: 110 }}
                  onChange={(v) => setRandomRule({ ...randomRule, scorePer: v ?? 2 })} /></div>
              </div>
              <div>
                <Typography.Text type="secondary">合计</Typography.Text>
                <div>
                  <Tag color="blue">
                    {(randomRule.singleCount ?? 0) + (randomRule.multipleCount ?? 0) + (randomRule.judgeCount ?? 0)} 题 /
                    总分 {(randomRule.singleCount ?? 0) + (randomRule.multipleCount ?? 0) + (randomRule.judgeCount ?? 0)} × {randomRule.scorePer ?? 2}
                  </Tag>
                </div>
              </div>
            </Space>
          </>
        )}

        {examMode === 'FIXED' && bankId && (
          <>
            <Space style={{ marginBottom: 8 }}>
              <Input.Search placeholder="搜索题目加入试卷" allowClear style={{ width: 220 }} onSearch={setQkeyword} />
              <Typography.Text type="secondary">已选 {Object.keys(picker).length} 题 / 总分 {totalScore}</Typography.Text>
            </Space>
            <List
              size="small" loading={qLoading} style={{ maxHeight: 320, overflow: 'auto' }}
              dataSource={qData?.items ?? []}
              renderItem={(q) => {
                const checked = q.id in picker
                return (
                  <List.Item
                    actions={[
                      <Checkbox key="c" checked={checked}
                        onChange={(e) => {
                          const next = { ...picker }
                          if (e.target.checked) next[q.id] = Number(q.score) || 2
                          else delete next[q.id]
                          setPicker(next)
                        }} />,
                      <InputNumber key="s" size="small" min={1} max={20} value={picker[q.id]}
                        disabled={!checked} onChange={(v) => setPicker({ ...picker, [q.id]: Number(v) || 1 })}
                        style={{ width: 80 }} />,
                    ]}
                  >
                    <Typography.Text ellipsis style={{ maxWidth: 480 }}>
                      <Tag>{TYPE_LABEL[q.type]}</Tag>{q.content}
                    </Typography.Text>
                  </List.Item>
                )
              }}
            />
          </>
        )}
      </Modal>

      {/* 试卷详情 */}
      <Modal title={detail ? `试卷：${detail.name}` : '试卷详情'} open={detailOpen} width={820}
        footer={null} onCancel={() => setDetailOpen(false)}>
        {detail && (
          <>
            <Descriptions size="small" column={4} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="题数">{detail.questionCount}</Descriptions.Item>
              <Descriptions.Item label="总分">{Number(detail.totalScore)}</Descriptions.Item>
              <Descriptions.Item label="时长">{detail.duration} 分</Descriptions.Item>
              <Descriptions.Item label="类型">{detail.examType === 'FIXED' ? '固定组卷' : '随机'}</Descriptions.Item>
            </Descriptions>
            <List size="small" dataSource={detail.questions} style={{ maxHeight: 440, overflow: 'auto' }}
              renderItem={(q) => (
                <List.Item>
                  <Space align="start">
                    <Tag color="blue">{q.sort + 1}</Tag>
                    <div>
                      <Typography.Text>{q.content}</Typography.Text>
                      <div style={{ color: '#999', fontSize: 12 }}>
                        答案: <Tag color="green">{q.answerKeys.join('')}</Tag> 分值: {Number(q.score)}
                      </div>
                    </div>
                  </Space>
                </List.Item>
              )} />
          </>
        )}
      </Modal>
    </Card>
  )
}
