import { defineHandler } from 'nitro/h3'
import { requireAdmin } from '../../../utils/auth'
import { getQuery } from 'nitro/h3'
import { query } from '../../../utils/db'

/** 题目列表（多维筛选 + 分页） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(Number(q.page ?? 1), 1)
  const size = Math.min(Math.max(Number(q.size ?? 20), 1), 100)
  const params: unknown[] = []
  const where: string[] = []

  const add = (cond: string, val: unknown) => {
    params.push(val)
    where.push(cond.replace('?', `$${params.length}`))
  }
  if (q.bankId) add('q.bank_id = ?', Number(q.bankId))
  if (q.categoryId) add('q.category_id = ?', Number(q.categoryId))
  if (q.type) add('q.type = ?', q.type)
  if (q.status !== undefined && q.status !== '') add('q.status = ?', Number(q.status))
  if (q.keyword) add('q.content ILIKE ?', `%${q.keyword}%`)

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const total = await query(`SELECT COUNT(*)::int AS n FROM question q ${whereSql}`, params)
  const rows = await query(
    `SELECT q.id, q.bank_id, q.category_id, q.type, q.content, q.analysis, q.difficulty, q.score, q.status, q.created_at,
            b.name AS bank_name, c.name AS category_name,
            (SELECT json_agg(json_build_object('optionKey', o.option_key, 'content', o.content) ORDER BY o.sort)
             FROM question_option o WHERE o.question_id = q.id) AS options,
            (SELECT json_agg(o.option_key ORDER BY o.option_key) FROM question_answer a
             JOIN question_option o ON o.id = a.option_id WHERE a.question_id = q.id) AS answer_keys
     FROM question q
     LEFT JOIN question_bank b ON b.id = q.bank_id
     LEFT JOIN question_category c ON c.id = q.category_id
     ${whereSql}
     ORDER BY q.id DESC
     LIMIT ${size} OFFSET ${(page - 1) * size}`,
    params
  )
  return {
    total: total.rows[0].n,
    page,
    size,
    items: rows.rows.map((r) => ({
      id: r.id,
      bankId: r.bank_id,
      bankName: r.bank_name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      type: r.type,
      content: r.content,
      analysis: r.analysis,
      difficulty: r.difficulty,
      score: Number(r.score),
      status: r.status,
      createdAt: r.created_at,
      options: r.options,
      answerKeys: r.answer_keys ?? [],
    })),
  }
})
