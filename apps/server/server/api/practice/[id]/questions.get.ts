import { defineHandler, createError } from 'nitro/h3'
import { requireUser, numParam } from '../../../utils/auth'
import { query } from '../../../utils/db'

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
    `SELECT q.id, q.type, q.content, q.difficulty, q.category_id,
            c.name AS category_name,
            COALESCE(
              json_agg(
                json_build_object('id', o.id, 'optionKey', o.option_key, 'content', o.content)
                ORDER BY o.sort
              ) FILTER (WHERE o.id IS NOT NULL), '[]'
            ) AS options
    FROM question q
    LEFT JOIN question_category c ON c.id = q.category_id
    LEFT JOIN question_option o ON o.question_id = q.id
    WHERE q.id = ANY($1::bigint[])
    GROUP BY q.id, q.type, q.content, q.difficulty, q.category_id, c.name
    ORDER BY array_position($1::bigint[], q.id)`,
    [ids]
  )

  // 已答记录（用于恢复答题状态）：带上正确答案/解析/耗时，保证恢复态展示完整
  const answered = await query(
    `SELECT DISTINCT ON (ur.question_id)
            ur.question_id, ur.user_answer, ur.correct, ur.duration,
            q.analysis,
            (SELECT json_agg(o.option_key ORDER BY o.option_key)
             FROM question_answer a
             JOIN question_option o ON o.id = a.option_id
             WHERE a.question_id = ur.question_id) AS answer_keys
     FROM user_question_record ur
     JOIN question q ON q.id = ur.question_id
     WHERE ur.practice_id = $1 AND ur.user_id = $2
     ORDER BY ur.question_id, ur.answered_at DESC`,
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
    questions: questions.rows.map((q) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      difficulty: q.difficulty,
      categoryId: q.category_id,
      categoryName: q.category_name,
      options: q.options,
    })),
    answered: answered.rows.map((a) => ({
      questionId: a.question_id,
      userAnswer: a.user_answer,
      correct: a.correct,
      answerKeys: a.answer_keys ?? [],
      analysis: a.analysis ?? null,
      duration: a.duration,
    })),
  }
})
