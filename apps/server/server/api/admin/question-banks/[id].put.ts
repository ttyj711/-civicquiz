import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, numParam, readJson } from '../../utils/auth'
import { query } from '../../utils/db'

interface BankPutBody {
  name?: string
  description?: string
  coverUrl?: string
  sort?: number
  status?: number
}

/** 编辑题库 */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const id = numParam(event)
  const body = await readJson<BankPutBody>(event)

  const fields: string[] = []
  const params: unknown[] = []
  const set = (col: string, val: unknown) => {
    params.push(val)
    fields.push(`${col} = $${params.length}`)
  }
  if (body.name !== undefined) set('name', body.name)
  if (body.description !== undefined) set('description', body.description)
  if (body.coverUrl !== undefined) set('cover_url', body.coverUrl)
  if (body.sort !== undefined) set('sort', body.sort)
  if (body.status !== undefined) set('status', body.status)
  if (fields.length === 0) throw createError({ statusCode: 400, message: '无更新字段' })

  const r = await query(
    `UPDATE question_bank SET ${fields.join(', ')} WHERE id = ${id} RETURNING id`
  )
  if (!r.rows[0]) throw createError({ statusCode: 404, message: '题库不存在' })
  return { ok: true }
})
