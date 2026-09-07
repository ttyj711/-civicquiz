import { defineHandler, createError } from 'nitro/h3'
import { requireUser, numParam } from '../../utils/auth'
import { query } from '../../utils/db'
import { judge } from '../../utils/judge'

/** 考试详情（含逐题回顾：用户答案/正确答案/解析 —— 仅交卷后可看） */
export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const id = numParam(event)

  const ue = await query(
    `SELECT ue.id, ue.exam_id, ue.status, ue.score, ue.total_score, ue.correct_count,
            ue.wrong_count, ue.unanswered_count, ue.start_time, ue.submit_time, ue.duration,
            e.name AS exam_name
     FROM user_exam ue JOIN exam e ON e.id = ue.exam_id
     WHERE ue.id = $1 AND ue.user_id = $2`,
    [id, user.uid]
  )
  if (!ue.rows[0]) throw createError({ statusCode: 404, message: '考试记录不存在' })
  const record = ue.rows[0]

  // 逐题：快照顺序 + 用户答案 +（交卷后）正确答案与解析
  const items = await query(
    `SELECT eq.question_id, eq.score, eq.sort, q.content, q.analysis, q.type,
            (SELECT json_agg(json_build_object('optionKey', o.option_key, 'content', o.content) ORDER BY o.sort)
             FROM question_option o WHERE o.question_id = q.id) AS options,
            (SELECT json_agg(o.option_key ORDER BY o.option_key) FROM question_answer a
             JOIN question_option o ON o.id = a.option_id WHERE a.question_id = q.id) AS answer_keys,
            ua.user_answer
     FROM exam_question eq
     JOIN question q ON q.id = eq.question_id
     LEFT JOIN user_exam_answer ua ON ua.question_id = eq.question_id AND ua.user_exam_id = $1
     WHERE eq.exam_id = $2
     ORDER BY eq.sort, eq.id`,
    [id, record.exam_id]
  )

  const submitted = record.status === 2
  return {
    id: record.id,
    examId: record.exam_id,
    examName: record.exam_name,
    status: record.status,
    score: record.score === null ? null : Number(record.score),
    totalScore: record.total_score === null ? null : Number(record.total_score),
    correctCount: record.correct_count,
    wrongCount: record.wrong_count,
    unansweredCount: record.unanswered_count,
    startTime: record.start_time,
    submitTime: record.submit_time,
    duration: record.duration,
    questions: items.rows.map((q) => ({
      questionId: q.question_id,
      type: q.type,
      content: q.content,
      score: Number(q.score),
      options: q.options,
      userAnswer: q.user_answer,
      // 未交卷不暴露正确答案与解析
      answerKeys: submitted ? (q.answer_keys ?? []) : undefined,
      analysis: submitted ? q.analysis : undefined,
      correct: submitted && q.user_answer != null ? judge(q.user_answer as string | string[], q.answer_keys ?? []) : undefined,
    })),
  }
})
