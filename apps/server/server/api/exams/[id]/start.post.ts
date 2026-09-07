import { defineHandler, createError } from 'nitro/h3'
import { requireUser, numParam } from '../../utils/auth'
import { query, tx } from '../../utils/db'

/**
 * 开始考试：
 * - 固化试卷快照（exam_question 已是管理员创建时固化的快照）
 * - 服务端记录 start_time，倒计时以服务端为准
 * - 返回题目不含答案
 */
export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const examId = numParam(event)

  const exam = await query(
    'SELECT id, name, duration, total_score, question_count, status FROM exam WHERE id = $1',
    [examId]
  )
  if (!exam.rows[0]) throw createError({ statusCode: 404, message: '考试不存在' })
  if (exam.rows[0].status !== 1) throw createError({ statusCode: 400, message: '考试未发布' })

  // 若有进行中的未交卷考试，直接续考
  const ongoing = await query(
    `SELECT id, start_time FROM user_exam WHERE user_id = $1 AND exam_id = $2 AND status = 1`,
    [user.uid, examId]
  )
  let userExamId: number
  let startTime: Date
  if (ongoing.rows[0]) {
    userExamId = ongoing.rows[0].id
    startTime = ongoing.rows[0].start_time
  } else {
    const created = await tx(async (client) => {
      const r = await client.query(
        `INSERT INTO user_exam (user_id, exam_id, status, start_time) VALUES ($1, $2, 1, now()) RETURNING id, start_time`,
        [user.uid, examId]
      )
      return r.rows[0]
    })
    userExamId = created.id
    startTime = created.start_time
  }

  const questions = await query(
    `SELECT q.id, q.type, q.content, q.difficulty, eq.score, eq.sort,
            COALESCE(
              (SELECT json_agg(json_build_object('id', o.id, 'optionKey', o.option_key, 'content', o.content) ORDER BY o.sort)
               FROM question_option o WHERE o.question_id = q.id), '[]'
            ) AS options
     FROM exam_question eq
     JOIN question q ON q.id = eq.question_id
     WHERE eq.exam_id = $1
     ORDER BY eq.sort, eq.id`,
    [examId]
  )

  const remaining = exam.rows[0].duration * 60 - Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)

  return {
    userExamId,
    exam: { id: exam.rows[0].id, name: exam.rows[0].name, duration: exam.rows[0].duration, totalScore: Number(exam.rows[0].total_score) },
    serverTime: new Date().toISOString(),
    remainingSeconds: Math.max(remaining, 0),
    questions: questions.rows.map((q) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      difficulty: q.difficulty,
      score: Number(q.score),
      options: q.options,
    })),
  }
})
