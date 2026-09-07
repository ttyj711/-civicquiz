import { defineHandler, createError } from 'nitro/h3'
import { requireUser, numParam } from '../../utils/auth'
import { query } from '../../utils/db'

/**
 * 批量返回刷题题目（题干+选项，绝不包含答案字段）
 */
export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const practiceId = numParam(event)

  const p = await query(
    `SELECT id, user_id, bank_id, mode, total_count, correct_count, wrong_count, status, question_ids
     FROM practice WHERE id = $1 AND user_id = $2`,
    [practiceId, user.uid]
  )
  if (!p.rows[0]) throw createError({ statusCode: 404, message: '刷题会话不存在' })
  const practice = p.rows[0]

  const ids = (practice.question_ids as number[]) ?? []
  if (ids.length === 0) return { questions: [] }

  // 题干 + 选项（不含 question_answer）
  const questions = await query(
    `SELECT q.id, q.type, q.content, q.difficulty,
            COALESCE(
              json_agg(
                json_build_object('id', o.id, 'optionKey', o.option_key, 'content', o.content)
                ORDER BY o.sort
              ) FILTER (WHERE o.id IS NOT NULL), '[]'
            ) AS options
     FROM question q
     LEFT JOIN question_option o ON o.question_id = q.id
     WHERE q.id = ANY($1::bigint[])
     GROUP BY q.id, q.type, q.content, q.difficulty
     ORDER BY array_position($1::bigint[], q.id)`,
    [ids]
  )

  // 已答记录（用于恢复答题状态）
  const answered = await query(
    `SELECT question_id, user_answer, correct FROM user_question_record
     WHERE practice_id = $1 AND user_id = $2`,
    [practiceId, user.uid]
  )

  return {
    practice: {
      id: practice.id,
      bankId: practice.bank_id,
      mode: practice.mode,
      totalCount: practice.total_count,
      correctCount: practice.correct_count,
      wrongCount: practice.wrong_count,
      status: practice.status,
    },
    questions: questions.rows,
    answered: answered.rows.map((a) => ({
      questionId: a.question_id,
      userAnswer: a.user_answer,
      correct: a.correct,
    })),
  }
})
