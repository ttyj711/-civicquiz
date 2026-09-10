import { defineHandler } from 'nitro/h3'
import { requireAdmin } from '../../../utils/auth'
import { getQuery } from 'nitro/h3'
import { query } from '../../../utils/db'

/** 用户列表（后台）：基础信息 + 累计答题/正确率/考试数 */
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
  if (q.keyword) add('(u.nickname ILIKE ? OR u.openid ILIKE ?)', `%${q.keyword}%`)

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  // COUNT 与数据查询互相独立，并行执行
  const [total, rows] = await Promise.all([
    query(`SELECT COUNT(*)::int AS n FROM sys_user u ${whereSql}`, params),
    query(
      `SELECT u.id, u.nickname, u.avatar_url, u.status, u.last_login_at, u.created_at,
            (SELECT COUNT(*)::int FROM user_question_record r WHERE r.user_id = u.id) AS answered,
            (SELECT COUNT(*)::int FROM user_question_record r WHERE r.user_id = u.id AND r.correct) AS correct,
            (SELECT COUNT(*)::int FROM user_exam ue WHERE ue.user_id = u.id AND ue.status = 2) AS exams
     FROM sys_user u
     ${whereSql}
     ORDER BY u.id DESC
     LIMIT ${size} OFFSET ${(page - 1) * size}`,
      params
    ),
  ])
  return {
    total: total.rows[0].n,
    page,
    size,
    items: rows.rows.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      avatarUrl: u.avatar_url,
      status: u.status,
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
      answered: u.answered,
      accuracy: u.answered ? Math.round((u.correct / u.answered) * 100) : 0,
      exams: u.exams,
    })),
  }
})
