// 题目批量导入弹窗（Excel/CSV，从 QuestionsPage 拆分）
import { useState } from 'react'
import { Alert, App, Button, Modal, Select, Space, Upload } from 'antd'
import type { UploadFile } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importQuestions } from '../api'
import type { ImportResult } from '../api'
import type { Bank } from '../api/types'

interface Props {
  open: boolean
  banks: Bank[]
  /** 默认选中的题库（跟随列表筛选） */
  defaultBankId?: number
  onClose: () => void
}

export default function ImportModal({ open, banks, defaultBankId, onClose }: Props) {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [bankId, setBankId] = useState<number | undefined>()
  const [file, setFile] = useState<UploadFile | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  // 批量导入：逐行校验入库，失败行不影响其余
  const doImport = useMutation({
    mutationFn: () => importQuestions(bankId!, file!.originFileObj as File),
    onSuccess: (res) => {
      setResult(res)
      message.success(`导入完成：成功 ${res.success} 题，失败 ${res.failed} 题`)
      qc.invalidateQueries({ queryKey: ['questions'] })
      qc.invalidateQueries({ queryKey: ['banks'] })
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
    },
    onError: (e) => message.error((e as Error).message),
  })

  /** 下载导入模板（UTF-8 BOM CSV，Excel 可直接打开） */
  const downloadTemplate = () => {
    const header = '题干,题型,选项A,选项B,选项C,选项D,答案,解析,难度,分值,分类'
    const rows = [
      '中华人民共和国成立于哪一年,单选,1949,1948,1950,1951,A,1949年10月1日,1,2,基本常识',
      '下列哪些属于可再生能源？,多选,太阳能,煤炭,风能,石油,ACD,,3,2,基本常识',
      '宪法是国家的根本法。,判断,,,,正确,,,2,宪法知识',
    ]
    const csv = '\uFEFF' + [header, ...rows].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = '题目导入模板.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // 每次打开重置（open 变化时由父组件 destroyOnHidden + key 控制更简单，这里用 afterOpenChange）
  const reset = () => {
    setResult(null)
    setFile(null)
    setBankId(defaultBankId)
  }

  return (
    <Modal
      title="批量导入题目"
      open={open}
      width={720}
      onCancel={onClose}
      okText="开始导入"
      okButtonProps={{ disabled: !(bankId ?? defaultBankId) || !file, loading: doImport.isPending }}
      onOk={() => doImport.mutate()}
      afterOpenChange={(v) => { if (v) reset() }}
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: '100%' }} size={12}>
        <Space wrap>
          <span>目标题库：</span>
          <Select
            style={{ width: 220 }} placeholder="选择导入到的题库"
            value={bankId ?? defaultBankId}
            onChange={setBankId}
            options={banks.map((b) => ({ value: b.id, label: `${b.name}（${b.questionCount ?? 0} 题）` }))}
          />
          <Button onClick={downloadTemplate}>下载模板</Button>
        </Space>
        <Alert
          type="info" showIcon
          title="支持 .xlsx / .xls / .csv，表头：题干、题型(单选/多选/判断)、选项A~F、答案、解析、难度(1-5)、分值、分类"
          description="判断题答案填「正确/错误」；选择题答案填字母（多选如 ABD）。分类不存在时自动创建；校验失败的行会跳过，不影响其他题目。"
        />
        <Upload.Dragger
          maxCount={1}
          accept=".xlsx,.xls,.csv"
          fileList={file ? [file] : []}
          beforeUpload={(_f, fileList) => {
            const f = fileList[0]
            setFile({ uid: f.uid, name: f.name, status: 'done', originFileObj: f })
            setResult(null)
            return false // 手动上传
          }}
          onRemove={() => { setFile(null); setResult(null) }}
        >
          <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
          <p className="ant-upload-hint">单次最多 2000 题</p>
        </Upload.Dragger>

        {result && (
          <Alert
            type={result.failed > 0 ? 'warning' : 'success'} showIcon
            title={`成功 ${result.success} 题 / 失败 ${result.failed} 题`}
            description={
              result.errors.length > 0 ? (
                <div style={{ maxHeight: 180, overflow: 'auto' }}>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#999' }}>
                      第 {e.row} 行：{e.reason}
                    </div>
                  ))}
                </div>
              ) : '全部导入成功'
            }
          />
        )}
      </Space>
    </Modal>
  )
}
