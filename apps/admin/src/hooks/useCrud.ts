// 通用 CRUD mutation 封装：message 反馈 + 查询失效，消除列表页重复代码
/* eslint-disable @typescript-eslint/no-explicit-any */
import { App } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface CrudApi {
  create: (data: any) => Promise<unknown>
  update: (id: number, data: any) => Promise<unknown>
  remove: (id: number) => Promise<unknown>
  /** 操作成功后需要失效的 queryKey 列表 */
  queryKeys: string[]
}

export function useCrud(api: CrudApi) {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const invalidate = () => api.queryKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
  const onError = (e: unknown) => message.error((e as Error).message)

  /** 新增 / 编辑（editing 为 null 时走 create） */
  const save = useMutation({
    mutationFn: ({ editing, values }: { editing: { id: number } | null; values: any }) =>
      editing ? api.update(editing.id, values) : api.create(values),
    onSuccess: () => { message.success('保存成功'); invalidate() },
    onError,
  })

  const del = useMutation({
    mutationFn: (id: number) => api.remove(id),
    onSuccess: () => { message.success('已删除'); invalidate() },
    onError,
  })

  /** 启用/禁用切换（统一带成功反馈） */
  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) =>
      api.update(id, { status }),
    onSuccess: () => { message.success('已更新'); invalidate() },
    onError,
  })

  return { save, del, toggle, invalidate }
}
