import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, numParam, readJson } from '../../utils/auth'
import { query } from '../../utils/db'

/** 编辑考试（状态/时间/说明；组卷变更建议重建考试） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const id = numParam(event)
  const body = await readJson<{
    name?: string
    description?: string
    duration?: number
    status?: number
    startAt?: string
    endAt?: string
  }>(event)

  const fields: string[] = []
  const params: unknown[] = []
  const set = (col: string, val: unknown) => {
    params.push(val)
    fields.push(`${col} = $${params.length}`)
  }
  if (body.name !== undefined) set('name', body.name)
  if (body.description !== undefined) set('description', body.description)
  if (body.duration !== undefined) set('duration', body.duration)
  if (body.status !== undefined) set('status', body.status)
  if (body.startAt !== undefined) set('start_at', body.startAt)
  if (body.endAt !== undefined) set('end_at', body.endAt)
  if (fields.length === 0) throw createError({ statusCode: 400, message: '无更新字段' })

  const r = await query(`UPDATE exam SET ${fields.join(', ')} WHERE id = ${id} RETURNING id`)
  if (!r.rows[0]) throw createError({ statusCode: 404, message: '考试不存在' })
  return { ok: true }
})
