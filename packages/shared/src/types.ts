/** 题型枚举：第一阶段仅启用 SINGLE，表结构与组件预留其余 */
export const QUESTION_TYPE = {
  SINGLE: 'SINGLE',
  MULTIPLE: 'MULTIPLE',
  JUDGE: 'JUDGE',
} as const
export type QuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE]

/** 刷题模式 */
export const PRACTICE_MODE = {
  NORMAL: 'NORMAL', // 顺序
  RANDOM: 'RANDOM', // 随机
  WRONG: 'WRONG', // 错题
  FAVORITE: 'FAVORITE', // 收藏
  CATEGORY: 'CATEGORY', // 分类专项
} as const
export type PracticeMode = (typeof PRACTICE_MODE)[keyof typeof PRACTICE_MODE]

/** 通用状态：1 启用 / 0 禁用 */
export type CommonStatus = 0 | 1

/** 难度 1-5 */
export type Difficulty = 1 | 2 | 3 | 4 | 5

/** 刷题/考试会话状态 */
export const SESSION_STATUS = {
  ONGOING: 'ONGOING',
  FINISHED: 'FINISHED',
  EXPIRED: 'EXPIRED',
} as const
export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS]

/** 用户答案（JSONB 存储格式） */
export type UserAnswer = string | string[]

// ---------- DTO ----------

export interface QuestionOptionDTO {
  id: number
  optionKey: string
  content: string
}

/** 题目（不含答案，刷题/考试取题接口返回此结构） */
export interface QuestionDTO {
  id: number
  bankId: number
  categoryId: number
  type: QuestionType
  content: string
  difficulty: Difficulty
  options: QuestionOptionDTO[]
}

/** 提交答案后的判题结果 */
export interface JudgeResultDTO {
  correct: boolean
  answerKeys: string[] // 正确选项 key，如 ["A"] 或 ["A","C"]
  userKeys: string[]
  analysis: string
}

export interface QuestionBankDTO {
  id: number
  name: string
  description: string
  coverUrl: string
  questionCount: number
}

export interface QuestionCategoryDTO {
  id: number
  parentId: number
  name: string
  children?: QuestionCategoryDTO[]
}

export interface ExamDTO {
  id: number
  bankId: number
  name: string
  description: string
  duration: number // 分钟
  totalScore: number
  questionCount: number
}

export interface UserStatisticsDTO {
  todayAnswered: number
  todayCorrect: number
  todayAccuracy: number
  totalAnswered: number
  totalAccuracy: number
  examCount: number
  avgExamScore: number
  maxExamScore: number
  wrongCount: number
  favoriteCount: number
}
