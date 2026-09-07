import { z } from 'zod'
import { QUESTION_TYPE } from './types'

/** 微信登录入参 */
export const loginSchema = z.object({
  code: z.string().min(1),
})

/** 开始刷题入参 */
export const practiceStartSchema = z.object({
  bankId: z.number().int().positive(),
  categoryId: z.number().int().positive().optional(),
  mode: z.enum(['NORMAL', 'RANDOM', 'WRONG', 'FAVORITE', 'CATEGORY']).default('NORMAL'),
  count: z.number().int().min(1).max(100).default(50),
})

/** 提交答案入参 */
export const answerSchema = z.object({
  questionId: z.number().int().positive(),
  /** 单选: "A"；多选: ["A","C"]；判断: "TRUE"/"FALSE" */
  answer: z.union([z.string(), z.array(z.string())]),
  duration: z.number().int().min(0).optional(),
})

/** 开始考试入参 */
export const examStartSchema = z.object({
  examId: z.number().int().positive(),
})

/** 考试交卷入参（可选携带本地耗时秒数，服务端时间为准） */
export const examSubmitSchema = z.object({
  clientDuration: z.number().int().min(0).optional(),
})

/** 后台题目导入行校验（Excel 每行） */
export const importRowSchema = z.object({
  bankName: z.string().min(1, '题库不能为空'),
  categoryName: z.string().min(1, '分类不能为空'),
  type: z.nativeEnum(QUESTION_TYPE),
  content: z.string().min(1, '题目内容为空'),
  options: z.array(z.object({ key: z.string(), content: z.string() })).min(2),
  answerKeys: z.array(z.string()).min(1, '正确答案不能为空'),
  analysis: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).default(2),
})
