import { defineHandler, createError } from 'nitro/h3'
import { requireUser, numParam } from '../../utils/auth'
import { query } from '../../utils/db'

export default defineHandler(async (event) => {
  await requireUser(event)
  const id = numParam(event)
  const r = await query(
    `SELECT e.id, e.bank_id, e.name, e.description, e.duration, e.total_score, e.question_count, e.exam_type,
            (SELECT json_agg(json_build_object('type', q.type, 'count', 1))
             FROM exam_question eq JOIN question q ON q.id = eq.question_id
             WHERE eq.exam_id = e.id) AS type_stat
     FROM exam e WHERE e.id = $1 AND e.status = 1`,
    [id]
  )
  if (!r.rows[0]) throw createError({ statusCode: 404, message: '考试不存在' })
  const e = r.rows[0]

  // 按题型聚合
  const typeCount: Record<string, number> = {}
  for (const t of e.type_stat ?? []) typeCount[t.type] = (typeCount[t.type] ?? 0) + 1
  const typeList = Object.entries(typeCount).map(([type, count]) => ({ type, count }))

  return {
    id: e.id,
    bankId: e.bank_id,
    name: e.name,
    description: e.description,
    duration: e.duration,
    totalScore: Number(e.total_score),
    questionCount: e.question_count,
    examType: e.exam_type,
    typeList,
  }
})
