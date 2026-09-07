// 管理后台数据类型（与 packages/shared + server API 对齐）
export interface AdminInfo {
  id: number
  username: string
  nickname: string
}

export interface Bank {
  id: number
  name: string
  description: string | null
  coverUrl: string | null
  status: number
  sort: number
  questionCount: number
  categoryCount: number
  createdAt: string
}

export interface Category {
  id: number
  bankId: number
  parentId: number
  name: string
  sort: number
  status: number
  questionCount: number
}

export interface QuestionOptionDto {
  id?: number
  optionKey: string
  content: string
}

export interface Question {
  id: number
  bankId: number
  bankName?: string
  categoryId: number | null
  categoryName?: string | null
  type: 'SINGLE' | 'MULTIPLE' | 'JUDGE'
  content: string
  analysis: string | null
  difficulty: number
  score: number
  status: number
  createdAt: string
  options: QuestionOptionDto[] | null
  answerKeys: string[]
}

export interface PageResult<T> {
  total: number
  page: number
  size: number
  items: T[]
}

/** 题目创建/更新载荷 */
export interface QuestionPayload {
  bankId: number
  categoryId: number | null
  type: 'SINGLE' | 'MULTIPLE' | 'JUDGE'
  content: string
  analysis: string | null
  difficulty: number
  score: number
  status: number
  options: Array<{ key: string; content: string; sort: number }>
  answerKeys: string[]
}

/** 随机组卷规则 */
export interface RandomRule {
  singleCount: number
  multipleCount: number
  judgeCount: number
  scorePer: number
}

/** 考试创建/更新载荷 */
export interface ExamPayload {
  bankId?: number
  name?: string
  description?: string | null
  duration?: number
  status?: number
  examType?: 'FIXED' | 'RANDOM'
  randomRule?: RandomRule
  questions?: Array<{ questionId: number; score: number }>
}

export interface Exam {
  id: number
  bankId: number
  bankName?: string
  name: string
  description: string | null
  duration: number
  totalScore: number
  questionCount: number
  examType: 'FIXED' | 'RANDOM'
  status: number
  startAt: string | null
  endAt: string | null
  participantCount?: number
  createdAt: string
}

export interface ExamDetail extends Exam {
  questions: Array<{
    questionId: number
    sort: number
    score: number
    type: string
    content: string
    options: QuestionOptionDto[] | null
    answerKeys: string[]
  }>
}

export interface ExamRecord {
  id: number
  examId: number
  examName: string
  userId: number
  nickname: string
  status: number
  score: number | null
  totalScore: number | null
  correctCount: number
  wrongCount: number
  unansweredCount: number
  duration: number | null
  startTime: string
  submitTime: string | null
}

export interface AdminStats {
  users: number
  banks: number
  questions: number
  todayAnswers: number
  todayExams: number
  topWrong: Array<{
    questionId: number
    content: string
    bankName: string
    attempts: number
    wrong: number
    wrongRate: number
  }>
}
