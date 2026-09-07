import { defineHandler, createError } from 'nitro/h3'
import { requireUser, readJson } from '../../utils/auth'
import { query } from '../../utils/db'

interface StartBody {
  bankId: number
  categoryId?: number
  mode?: 'NORMAL' | 'RANDOM' | 'WRONG' | 'FAVORITE' | 'CATEGORY'
  count?: number
}

export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readJson<StartBody>(event)
  if (!body.bankId) throw createError({ statusCode: 400, message: '缺少 bankId' })
  const mode = body.mode ?? 'NORMAL'
  const count = Math.min(Math.max(body.count ?? 50, 1), 100)

  // 按模式选题：NORMAL 顺序 / RANDOM 随机 / WRONG 错题 / FAVORITE 收藏 / CATEGORY 分类
  let ids: number[]
  const base = `FROM question q WHERE q.bank_id = $1 AND q.status = 1`
  const params: unknown[] = [body.bankId]
  let whereExtra = ''
  if (body.categoryId) {
    params.push(body.categoryId)
    whereExtra += ` AND q.category_id = $${params.length}`
  }
  if (mode === 'WRONG') {
    whereExtra += ` AND q.id IN (SELECT question_id FROM user_wrong_question WHERE user_id = $${params.length + 1} AND mastered = FALSE)`
    params.push(user.uid)
  } else if (mode === 'FAVORITE') {
    whereExtra += ` AND q.id IN (SELECT question_id FROM user_favorite_question WHERE user_id = $${params.length + 1})`
    params.push(user.uid)
  }
  const order = mode === 'RANDOM' ? 'ORDER BY random()' : 'ORDER BY q.id'
  const r = await query(`SELECT q.id ${base} ${whereExtra} ${order} LIMIT ${count}`, params)
  ids = r.rows.map((x) => x.id)

  if (ids.length === 0) throw createError({ statusCode: 400, message: '该范围内没有可用题目' })

  const practice = (
    await query(
      `INSERT INTO practice (user_id, bank_id, category_id, mode, total_count, question_ids, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, now()) RETURNING id`,
      [user.uid, body.bankId, body.categoryId ?? null, mode, ids.length, JSON.stringify(ids)]
    )
  ).rows[0]

  return { practiceId: practice.id, totalCount: ids.length, mode }
})
