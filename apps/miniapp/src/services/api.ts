// 小程序端 API 封装
import { api } from './request'

export interface Bank {
  id: number
  name: string
  description: string | null
  coverUrl: string | null
  questionCount: number
  categoryCount: number
}

export interface CategoryNode {
  id: number
  parentId: number
  name: string
  children?: CategoryNode[]
}

export interface BankDetail extends Bank {
  categories: CategoryNode[]
}

export interface QuestionOption {
  id: number
  optionKey: string
  content: string
}

export interface Question {
  id: number
  type: 'SINGLE' | 'MULTIPLE' | 'JUDGE'
  content: string
  difficulty: number
  score?: number
  categoryId?: number
  categoryName?: string | null
  options: QuestionOption[]
}

export interface Exam {
  id: number
  bankId: number
  name: string
  description: string | null
  duration: number
  totalScore: number
  questionCount: number
  examType: 'FIXED' | 'RANDOM'
  participantCount?: number
}

export interface ExamDetail extends Exam {
  typeList?: Array<{ type: string; count: number }>
}

export interface UserStats {
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

export interface WrongItem {
  id: number
  questionId: number
  content: string
  analysis: string | null
  bankId: number
  categoryId: number | null
  wrongCount: number
  mastered: boolean
  lastWrongAt: string
}

export interface FavoriteItem {
  id: number
  questionId: number
  content: string
  analysis: string | null
  bankId: number
  categoryId: number | null
  createdAt: string
}

export interface PracticeStartRes {
  practiceId: number
  totalCount: number
  mode: string
}

export interface PracticeQuestions {
  practice: {
    id: number
    bankId: number
    mode: string
    totalCount: number
    correctCount: number
    wrongCount: number
    status: number
  }
  questions: Question[]
  answered: Array<{
    questionId: number
    userAnswer: string | string[] | null
    correct: boolean | null
    answerKeys?: string[]
    analysis?: string | null
    duration?: number | null
  }>
}

export interface AnswerRes {
  correct: boolean
  userKeys: string[]
  answerKeys: string[]
  analysis: string | null
}

export interface ExamStartRes {
  userExamId: number
  exam: { id: number; name: string; duration: number; totalScore: number }
  serverTime: string
  remainingSeconds: number
  questions: Array<Question & { score: number }>
}

export interface SubmitRes {
  userExamId: number
  totalScore: number
  score: number
  correctCount: number
  wrongCount: number
  unansweredCount: number
  questionCount: number
  accuracy: number
  duration: number
}

export interface UserExamItem {
  id: number
  examId: number
  examName: string
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

export interface UserExamDetail extends UserExamItem {
  questions: Array<{
    questionId: number
    type: string
    content: string
    score: number
    options: QuestionOption[]
    userAnswer: string | string[] | null
    answerKeys?: string[]
    analysis?: string | null
    correct?: boolean
  }>
}

// ---------- 登录 ----------
export const loginByCode = (code: string) =>
  api<{ token: string; user: { id: number; nickname: string } }>('/api/auth/login', {
    method: 'POST',
    body: { code, nickname: '备考用户' },
  })

// ---------- 题库 ----------
export const fetchBanks = () => api<Bank[]>('/api/question-banks')
export const fetchBankDetail = (id: number) => api<BankDetail>(`/api/question-banks/${id}`)

// ---------- 刷题 ----------
export const startPractice = (body: {
  bankId: number
  categoryId?: number
  mode?: string
  count?: number
}) => api<PracticeStartRes>('/api/practice/start', { method: 'POST', body })
export const fetchPracticeQuestions = (pid: number) => api<PracticeQuestions>(`/api/practice/${pid}/questions`)
export const answerPractice = (pid: number, body: { questionId: number; answer: string | string[]; duration?: number }) =>
  api<AnswerRes>(`/api/practice/${pid}/answer`, { method: 'POST', body })
export const finishPractice = (pid: number) =>
  api<{ practiceId: number; totalCount: number; answeredCount: number; correctCount: number; wrongCount: number; accuracy: number }>(
    `/api/practice/${pid}/finish`,
    { method: 'POST' }
  )

// ---------- 错题/收藏 ----------
export const fetchWrong = () => api<WrongItem[]>('/api/wrong-questions')
export const masterWrong = (id: number) => api(`/api/wrong-questions/${id}/master`, { method: 'POST' })
export const removeWrong = (id: number) => api(`/api/wrong-questions/${id}`, { method: 'DELETE' })
export const fetchFavorites = () => api<FavoriteItem[]>('/api/favorites')
export const addFavorite = (qid: number) => api(`/api/favorites/${qid}`, { method: 'POST' })
export const removeFavorite = (qid: number) => api(`/api/favorites/${qid}`, { method: 'DELETE' })

// ---------- 考试 ----------
export const fetchExams = () => api<Exam[]>('/api/exams')
export const fetchExamDetail = (id: number) => api<ExamDetail>(`/api/exams/${id}`)
export const startExam = (examId: number) => api<ExamStartRes>(`/api/exams/${examId}/start`, { method: 'POST' })
export const saveExamAnswer = (examId: number, body: { userExamId: number; questionId: number; answer: string | string[] }) =>
  api<{ ok: boolean }>(`/api/exams/${examId}/answer`, { method: 'POST', body })
export const submitExam = (examId: number, body: { userExamId: number }) =>
  api<SubmitRes>(`/api/exams/${examId}/submit`, { method: 'POST', body })
export const fetchUserExams = () => api<UserExamItem[]>('/api/user-exams')
export const fetchUserExamDetail = (id: number) => api<UserExamDetail>(`/api/user-exams/${id}`)

// ---------- 我的 ----------
export const fetchStats = () => api<UserStats>('/api/user/statistics')
