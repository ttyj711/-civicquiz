import { defineHandler, createError } from 'nitro/h3'
import { requireUser, numParam, readJson } from '../../utils/auth'
import { query, tx } from '../../utils/db'
import { judge } from '../../utils/judge'

interface SubmitBody {
  userExamId: number
  clientDuration?: number
}

/** 交卷：服务端统一判分（含到时自动交卷场景） */
export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const examId = numParam(event)
  const body = await readJson<SubmitBody>(event)
  if (!body.userExamId) throw createError({ statusCode: 400, message: '缺少 userExamId' })

  const ue = await query(
    `SELECT ue.id, ue.status, ue.start_time, e.duration, e.total_score
     FROM user_exam ue JOIN exam e ON e.id = ue.exam_id
     WHERE ue.id = $1 AND ue.user_id = $2 AND ue.exam_id = $3`,
    [body.userExamId, user.uid, examId]
  )
  if (!ue.rows[0]) throw createError({ statusCode: 404, message: '考试记录不存在' })
  const record = ue.rows[0]
  if (record.status !== 1) throw createError({ statusCode: 400, message: '试卷已提交，请勿重复交卷' })

  // 试卷快照 + 正确答案（服务端判分，不暴露给前端）
  const snapshot = await query(
    `SELECT eq.question_id, eq.score,
            (SELECT json_agg(o.option_key ORDER BY o.option_key) FROM question_answer a
             JOIN question_option o ON o.id = a.option_id WHERE a.question_id = eq.question_id) AS answer_keys
     FROM exam_question eq WHERE eq.exam_id = $1 ORDER BY eq.sort`,
    [examId]
  )
  const answers = await query(
    'SELECT question_id, user_answer FROM user_exam_answer WHERE user_exam_id = $1',
    [body.userExamId]
  )
  const answerMap = new Map<number, string | string[]>()
  for (const a of answers.rows) answerMap.set(a.question_id, a.user_answer)

  let score = 0
  let correctCount = 0
  let wrongCount = 0
  let unansweredCount = 0
  const wrongQuestionIds: number[] = []
  const records: Array<{ questionId: number; answer: string | string[] | null; correct: boolean; got: number }> = []

  for (const q of snapshot.rows) {
    const correctKeys: string[] = q.answer_keys ?? []
    const userAnswer = answerMap.get(q.question_id)
    if (userAnswer === undefined || userAnswer === null) {
      unansweredCount++
      records.push({ questionId: q.question_id, answer: null, correct: false, got: 0 })
      continue
    }
    const ok = judge(userAnswer, correctKeys)
    const got = ok ? Number(q.score) : 0
    if (ok) correctCount++
    else {
      wrongCount++
      wrongQuestionIds.push(q.question_id)
    }
    score += got
    records.push({ questionId: q.question_id, answer: userAnswer, correct: ok, got })
  }

  const duration = Math.min(
    Math.floor((Date.now() - new Date(record.start_time).getTime()) / 1000),
    (record.duration ?? 0) * 60
  )

  await tx(async (client) => {
    // 考试答案逐题落答题事实表（exam_id 维度）
    for (const r of records) {
      await client.query(
        `INSERT INTO user_question_record (user_id, question_id, exam_id, user_answer, correct, answered_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [user.uid, r.questionId, examId, r.answer === null ? null : JSON.stringify(r.answer), r.correct]
      )
    }
    // 错题入账
    for (const qid of wrongQuestionIds) {
      await client.query(
        `INSERT INTO user_wrong_question (user_id, question_id, wrong_count, last_wrong_at)
         VALUES ($1, $2, 1, now())
         ON CONFLICT (user_id, question_id) DO UPDATE
         SET wrong_count = user_wrong_question.wrong_count + 1, last_wrong_at = now()`,
        [user.uid, qid]
      )
    }
    // 更新考试记录
    await client.query(
      `UPDATE user_exam
       SET status = 2, submit_time = now(), duration = $3,
           total_score = $4, score = $5, correct_count = $6, wrong_count = $7, unanswered_count = $8
       WHERE id = $1 AND user_id = $2`,
      [body.userExamId, user.uid, duration, Number(record.total_score), Number(score.toFixed(2)), correctCount, wrongCount, unansweredCount]
    )
  })

  return {
    userExamId: body.userExamId,
    totalScore: Number(record.total_score),
    score: Number(score.toFixed(2)),
    correctCount,
    wrongCount,
    unansweredCount,
    questionCount: snapshot.rows.length,
    accuracy: snapshot.rows.length ? Math.round((correctCount / snapshot.rows.length) * 100) : 0,
    duration,
  }
})
