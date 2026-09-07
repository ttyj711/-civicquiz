import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, numParam, readJson } from '../../../utils/auth'
import { query } from '../../../utils/db'

/** 编辑分类（名称/父级/排序/状态） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const id = numParam(event)
  const body = await readJson<{
    parentId?: number
    name?: string
    sort?: number
    status?: number
  }>(event)

  const fields: string[] = []
  const params: unknown[] = []
  const set = (col: string, val: unknown) => {
    params.push(val)
    fields.push(`${col} = $${params.length}`)
  }
  if (body.parentId !== undefined) set('parent_id', body.parentId)
  if (body.name !== undefined) set('name', body.name)
  if (body.sort !== undefined) set('sort', body.sort)
  if (body.status !== undefined) set('status', body.status)
  if (fields.length === 0) throw createError({ statusCode: 400, message: '无更新字段' })

  // 不能把自己挂到子分类下（防环）
  if (body.parentId !== undefined && body.parentId !== 0) {
    const parent = await query(
      `SELECT id FROM question_category WHERE id = $1 AND bank_id =
         (SELECT bank_id FROM question_category WHERE id = $2)`,
      [body.parentId, id]
    )
    if (!parent.rows[0]) throw createError({ statusCode: 400, message: '父分类不存在或不属于同一题库' })
    if (body.parentId === id) throw createError({ statusCode: 400, message: '父分类不能是自己' })
  }

  const r = await query(
    `UPDATE question_category SET ${fields.join(', ')} WHERE id = ${id} RETURNING id`,
    params
  )
  if (!r.rows[0]) throw createError({ statusCode: 404, message: '分类不存在' })
  return { ok: true }
})
