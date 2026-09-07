// 题目新增/编辑弹窗（从 QuestionsPage 拆分）
import { useEffect, useMemo, useState } from 'react'
import {
  App, Button, Form, Input, InputNumber, Modal, Radio, Select, Space, Tag,
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { createQuestion, updateQuestion } from '../api'
import type { Bank, Category, Question, QuestionPayload } from '../api/types'
import { TYPE_LABEL } from '../constants'

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

interface OptionRow { key: string; content: string }

interface Props {
  open: boolean
  editing: Question | null
  banks: Bank[]
  cats: Category[]
  onClose: () => void
}

export default function QuestionFormModal({ open, editing, banks, cats, onClose }: Props) {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const type: 'SINGLE' | 'MULTIPLE' | 'JUDGE' | undefined = Form.useWatch('type', form)

  // 编辑态独立字段（避免塞进 antd Form 产生非受控复杂度）
  const [opts, setOpts] = useState<OptionRow[]>([])
  const [answerKeys, setAnswerKeys] = useState<string[]>([])
  const [multi, setMulti] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const bankId = Form.useWatch('bankId', form)
  const bankCats = useMemo(() => (cats ?? []).filter((c) => c.bankId === bankId), [cats, bankId])

  // 弹窗打开时初始化/回显
  useEffect(() => {
    if (!open) return
    form.resetFields()
    if (editing) {
      form.setFieldsValue({
        bankId: editing.bankId, categoryId: editing.categoryId ?? undefined,
        type: editing.type, content: editing.content, analysis: editing.analysis ?? undefined,
        difficulty: editing.difficulty, score: editing.score, status: editing.status ?? 1,
      })
      const keys = editing.answerKeys ?? []
      setAnswerKeys(keys)
      setMulti(keys.length > 1)
      if (editing.type === 'JUDGE') {
        setOpts([{ key: 'TRUE', content: '正确' }, { key: 'FALSE', content: '错误' }])
      } else {
        setOpts(editing.options?.map((o) => ({ key: o.optionKey, content: o.content })) ?? [])
      }
    } else {
      form.setFieldsValue({ type: 'SINGLE', difficulty: 2, score: 2, status: 1 })
      setAnswerKeys([])
      setMulti(false)
      setOpts([{ key: 'A', content: '' }, { key: 'B', content: '' }, { key: 'C', content: '' }, { key: 'D', content: '' }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  // 题型切换时重置选项/答案
  useEffect(() => {
    if (!open) return
    if (type === 'JUDGE') {
      setOpts([{ key: 'TRUE', content: '正确' }, { key: 'FALSE', content: '错误' }])
      setAnswerKeys([])
      setMulti(false)
    } else if (type === 'SINGLE' || type === 'MULTIPLE') {
      // 仅当新建或从未有选项时初始化 A-D
      setOpts((cur) => (cur.length >= 2 ? cur : [
        { key: 'A', content: '' }, { key: 'B', content: '' }, { key: 'C', content: '' }, { key: 'D', content: '' },
      ]))
      if (type === 'SINGLE') { setAnswerKeys((k) => k.slice(0, 1)); setMulti(false) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, open])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['questions'] })
    qc.invalidateQueries({ queryKey: ['banks'] })
    qc.invalidateQueries({ queryKey: ['admin-categories'] })
  }

  const doSubmit = async () => {
    let v
    try {
      v = await form.validateFields()
    } catch {
      return // 校验失败，antd 已标红
    }
    if (v.type === 'JUDGE') {
      if (answerKeys.length !== 1) { message.error('请选择正确答案'); return }
    } else {
      const valid = opts.filter((o) => o.content.trim())
      if (valid.length < 2) { message.error('至少需要两个有效选项'); return }
      if (v.type === 'SINGLE' && answerKeys.length !== 1) { message.error('单选请选择 1 个答案'); return }
      if (v.type === 'MULTIPLE' && answerKeys.length < 2) { message.error('多选请至少选择 2 个答案'); return }
    }
    const payload: QuestionPayload = {
      bankId: v.bankId,
      categoryId: v.categoryId ?? null,
      type: v.type,
      content: v.content,
      analysis: v.analysis || null,
      difficulty: v.difficulty,
      score: v.score,
      status: v.status ?? 1,
      options: v.type === 'JUDGE'
        ? opts.map((o, i) => ({ key: o.key, content: o.content, sort: i }))
        : opts.map((o) => ({ key: o.key, content: o.content.trim(), sort: 0 })),
      answerKeys,
    }

    setSubmitting(true)
    try {
      if (editing) await updateQuestion(editing.id, payload)
      else await createQuestion(payload)
      message.success('保存成功')
      invalidate()
      onClose()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={editing ? `编辑题目 #${editing.id}` : '新增题目'} open={open} width={780}
      onCancel={onClose} onOk={doSubmit} confirmLoading={submitting} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Space align="start" wrap>
          <Form.Item name="bankId" label="题库" rules={[{ required: true, message: '必选' }]}>
            <Select style={{ width: 170 }} options={banks.map((b) => ({ value: b.id, label: b.name }))} placeholder="题库" />
          </Form.Item>
          <Form.Item name="categoryId" label="分类">
            <Select allowClear style={{ width: 170 }} options={bankCats.map((c) => ({ value: c.id, label: c.name }))} placeholder="分类(可空)" />
          </Form.Item>
          <Form.Item name="type" label="题型" rules={[{ required: true }]}>
            <Select style={{ width: 110 }} options={Object.entries(TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
          </Form.Item>
          <Form.Item name="difficulty" label="难度" rules={[{ required: true }]}>
            <Select style={{ width: 100 }} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: '★'.repeat(n) }))} />
          </Form.Item>
          <Form.Item name="score" label="分值" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} precision={0} style={{ width: 90 }} />
          </Form.Item>
        </Space>

        <Form.Item name="content" label="题干" rules={[{ required: true, message: '请输入题目内容' }]}>
          <Input.TextArea rows={3} placeholder="输入题目内容" />
        </Form.Item>
        <Form.Item name="analysis" label="解析">
          <Input.TextArea rows={2} placeholder="答案解析（选填）" />
        </Form.Item>

        {type && type !== 'JUDGE' && (
          <>
            <Form.Item label="选项（勾选左侧单选标记或右侧按钮切换多选）">
              {opts.map((o) => (
                <Space key={o.key} style={{ display: 'flex', marginBottom: 6 }} align="center">
                  <Radio
                    checked={!multi && answerKeys[0] === o.key}
                    onClick={() => { setMulti(false); setAnswerKeys([o.key]) }}
                  />
                  <Tag style={{ width: 40, textAlign: 'center' }}>{o.key}</Tag>
                  <Input value={o.content} style={{ width: 420 }} placeholder={`选项 ${o.key} 内容`}
                    onChange={(e) => setOpts(opts.map((x) => (x.key === o.key ? { ...x, content: e.target.value } : x)))} />
                  <Button type="text" danger icon={<DeleteOutlined />} disabled={opts.length <= 2}
                    onClick={() => {
                      const next = opts.filter((x) => x.key !== o.key)
                      setOpts(next)
                      setAnswerKeys((k) => k.filter((kk) => next.some((x) => x.key === kk)))
                    }} />
                </Space>
              ))}
              {opts.length < KEYS.length && (
                <Button size="small" type="dashed" icon={<PlusOutlined />}
                  onClick={() => setOpts([...opts, { key: KEYS[opts.length], content: '' }])}>
                  添加选项
                </Button>
              )}
            </Form.Item>
            <Form.Item label="正确答案">
              {multi ? (
                <Select mode="multiple" value={answerKeys} style={{ width: 420 }} placeholder="多选答案"
                  onChange={setAnswerKeys}
                  options={opts.map((o) => ({ value: o.key, label: `${o.key}. ${o.content || '(空)'}` }))} />
              ) : (
                <Select value={answerKeys[0]} style={{ width: 420 }} placeholder="选择正确答案"
                  onChange={(k) => setAnswerKeys(k ? [k] : [])}
                  options={opts.map((o) => ({ value: o.key, label: `${o.key}. ${o.content || '(空)'}` }))} />
              )}
              <Button size="small" style={{ marginLeft: 8 }} onClick={() => setMulti(!multi)}>
                {multi ? '切回单选' : '切换多选'}
              </Button>
            </Form.Item>
          </>
        )}

        {type === 'JUDGE' && (
          <Form.Item label="正确答案">
            <Radio.Group value={answerKeys[0]} onChange={(e) => setAnswerKeys([e.target.value])}>
              <Radio value="TRUE">正确</Radio>
              <Radio value="FALSE">错误</Radio>
            </Radio.Group>
          </Form.Item>
        )}
        <Form.Item name="status" hidden><InputNumber /></Form.Item>
      </Form>
    </Modal>
  )
}
