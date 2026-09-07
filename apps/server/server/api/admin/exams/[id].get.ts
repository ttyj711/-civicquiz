import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, numParam } from '../../../utils/auth'
import { query } from '../../../utils/db'

/** 管理端考试详情：基本信息 + 试卷题目列表（含答案，供后台组卷回显） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const id = numParam(event)
  const e = await query(
    `SELECT e.id, e.bank_id, e.name, e.description, e.duration, e.total_score, e.question_count,
            e.exam_type, e.status, e.start_at, e.end_at, e.created_at, b.name AS bank_name
     FROM exam e JOIN question_bank b ON b.id = e.bank_id
     WHERE e.id = $1`,
    [id]
  )
  if (!e.rows[0]) throw createError({ statusCode: 404, message: '考试不存在' })
  const exam = e.rows[0]

  const items = await query(
    `SELECT eq.question_id, eq.sort, eq.score, q.content, q.type,
            (SELECT json_agg(json_build_object('optionKey', o.option_key, 'content', o.content) ORDER BY o.sort)
             FROM question_option o WHERE o.question_id = q.id) AS options,
            (SELECT json_agg(o.option_key ORDER BY o.option_key) FROM question_answer a
             JOIN question_option o ON o.id = a.option_id WHERE a.question_id = q.id) AS answer_keys
     FROM exam_question eq JOIN question q ON q.id = eq.question_id
     WHERE eq.exam_id = $1
     ORDER BY eq.sort, eq.id`,
    [id]
  )

  return {
    // 字段映射为驼峰，与考试列表接口保持一致（前端 ExamDetail 类型依赖）
    id: exam.id,
    bankId: exam.bank_id,
    bankName: exam.bank_name,
    name: exam.name,
    description: exam.description,
    duration: exam.duration,
    totalScore: Number(exam.total_score),
    questionCount: exam.question_count,
    examType: exam.exam_type,
    status: exam.status,
    startAt: exam.start_at,
    endAt: exam.end_at,
    createdAt: exam.created_at,
    questions: items.rows.map((r) => ({
      questionId: r.question_id,
      sort: r.sort,
      score: Number(r.score),
      type: r.type,
      content: r.content,
      options: r.options,
      answerKeys: r.answer_keys ?? [],
    })),
  }
})
