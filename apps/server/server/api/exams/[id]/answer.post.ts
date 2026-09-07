import { defineHandler, createError } from 'nitro/h3'
import { requireUser, numParam, readJson } from '../../../utils/auth'
import { query } from '../../../utils/db'

interface ExamAnswerBody {
  userExamId: number
  questionId: number
  answer: string | string[]
}

/** 考试中保存答案：只存不判分（可重复修改，upsert 覆盖） */
export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const examId = numParam(event)
  const body = await readJson<ExamAnswerBody>(event)
  if (!body.userExamId || !body.questionId || body.answer === undefined) {
    throw createError({ statusCode: 400, message: '参数不完整' })
  }

  const ue = await query(
    `SELECT id, status, start_time FROM user_exam WHERE id = $1 AND user_id = $2 AND exam_id = $3`,
    [body.userExamId, user.uid, examId]
  )
  if (!ue.rows[0]) throw createError({ statusCode: 404, message: '考试记录不存在' })
  if (ue.rows[0].status !== 1) throw createError({ statusCode: 400, message: '考试已结束' })

  await query(
    `INSERT INTO user_exam_answer (user_exam_id, question_id, user_answer, answered_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_exam_id, question_id) DO UPDATE
     SET user_answer = EXCLUDED.user_answer, answered_at = now()`,
    [body.userExamId, body.questionId, JSON.stringify(body.answer)]
  )
  return { ok: true }
})
