import { defineHandler } from 'nitro/h3'
import { requireAdmin } from '../../utils/auth'
import { query } from '../../utils/db'

/** 工作台统计 + 题目错误率 Top */
export default defineHandler(async (event) => {
  await requireAdmin(event)

  // 两条查询互相独立，并行执行
  const [overview, topWrong] = await Promise.all([
    query(`
    SELECT
      (SELECT COUNT(*)::int FROM sys_user) AS users,
      (SELECT COUNT(*)::int FROM question_bank) AS banks,
      (SELECT COUNT(*)::int FROM question) AS questions,
      (SELECT COUNT(*)::int FROM user_question_record WHERE answered_at >= date_trunc('day', now())) AS today_answers,
      (SELECT COUNT(*)::int FROM user_exam WHERE start_time >= date_trunc('day', now())) AS today_exams`),
    query(`
    SELECT q.id, q.content, b.name AS bank_name,
            COUNT(*)::int AS attempts,
            COALESCE(SUM(CASE WHEN r.correct THEN 0 ELSE 1 END), 0)::int AS wrong
     FROM user_question_record r
     JOIN question q ON q.id = r.question_id
     JOIN question_bank b ON b.id = q.bank_id
     GROUP BY q.id, q.content, b.name
     HAVING COUNT(*) >= 1
     ORDER BY (SUM(CASE WHEN r.correct THEN 0 ELSE 1 END)::numeric / COUNT(*)) DESC
     LIMIT 10`),
  ])

  const o = overview.rows[0]
  return {
    users: o.users,
    banks: o.banks,
    questions: o.questions,
    todayAnswers: o.today_answers,
    todayExams: o.today_exams,
    topWrong: topWrong.rows.map((w) => ({
      questionId: w.id,
      content: w.content,
      bankName: w.bank_name,
      attempts: w.attempts,
      wrong: w.wrong,
      wrongRate: w.attempts ? Math.round((w.wrong / w.attempts) * 100) : 0,
    })),
  }
})
