import { defineHandler, createError } from 'nitro/h3'
import { answerSchema } from '@civicquiz/shared'
import { requireUser, numParam } from '../../../utils/auth'
import { readValidated } from '../../../utils/validate'
import { query, tx } from '../../../utils/db'
import { judge, normalizeKeys } from '../../../utils/judge'

export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const practiceId = numParam(event)
  const body = await readValidated(event, answerSchema)

  // 会话归属校验
  const p = await query(
    `SELECT id, status FROM practice WHERE id = $1 AND user_id = $2`,
    [practiceId, user.uid]
  )
  if (!p.rows[0]) throw createError({ statusCode: 404, message: '刷题会话不存在' })
  if (p.rows[0].status === 2) throw createError({ statusCode: 400, message: '本次刷题已结束' })

  // 正确答案与解析（判题后才对外暴露）
  const ans = await query(
    `SELECT q.analysis,
            (SELECT json_agg(o.option_key ORDER BY o.option_key) FROM question_answer a
             JOIN question_option o ON o.id = a.option_id WHERE a.question_id = q.id) AS answer_keys
     FROM question q WHERE q.id = $1`,
    [body.questionId]
  )
  if (!ans.rows[0]?.answer_keys) throw createError({ statusCode: 404, message: '题目不存在或无答案' })
  const correctKeys: string[] = ans.rows[0].answer_keys
  const analysis: string | null = ans.rows[0].analysis
  const userKeys = normalizeKeys(body.answer)
  const correct = judge(body.answer, correctKeys)

  await tx(async (client) => {
    // 事实记录：只插入
    await client.query(
      `INSERT INTO user_question_record (user_id, question_id, practice_id, user_answer, correct, duration, answered_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [user.uid, body.questionId, practiceId, JSON.stringify(body.answer), correct, body.duration ?? null]
    )
    if (correct) {
      await client.query(
        `UPDATE practice SET correct_count = correct_count + 1 WHERE id = $1`,
        [practiceId]
      )
    } else {
      await client.query(
        `UPDATE practice SET wrong_count = wrong_count + 1 WHERE id = $1`,
        [practiceId]
      )
      // 错题入账（upsert 累计错误次数）
      await client.query(
        `INSERT INTO user_wrong_question (user_id, question_id, wrong_count, last_wrong_at)
         VALUES ($1, $2, 1, now())
         ON CONFLICT (user_id, question_id) DO UPDATE
         SET wrong_count = user_wrong_question.wrong_count + 1,
             last_wrong_at = now(),
             mastered = FALSE,
             mastered_at = NULL`,
        [user.uid, body.questionId]
      )
    }
  })

  return { correct, userKeys, answerKeys: correctKeys, analysis }
})
