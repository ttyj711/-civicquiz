// API 接口函数
import { api, http } from './http'
import type {
  AdminStats, Bank, Category, Exam, ExamDetail, ExamPayload, ExamRecord, PageResult, Question, QuestionPayload,
} from './types'

// ---------- 认证 ----------
export function login(username: string, password: string) {
  return http.post<{ token: string; admin: { id: number; username: string; nickname: string } }>(
    '/api/admin/login',
    { username, password }
  )
}

// ---------- 题库 ----------
export const fetchBanks = () => http.get<Bank[]>('/api/admin/question-banks')
export const createBank = (data: Partial<Bank>) => http.post<{ id: number }>('/api/admin/question-banks', data)
export const updateBank = (id: number, data: Partial<Bank>) => http.put(`/api/admin/question-banks/${id}`, data)
export const deleteBank = (id: number) => http.del(`/api/admin/question-banks/${id}`)

// ---------- 分类 ----------
export const fetchCategories = () => http.get<Category[]>('/api/admin/question-categories')
export const createCategory = (data: { bankId: number; parentId?: number; name: string }) =>
  http.post<{ id: number }>('/api/admin/question-categories', data)
export const updateCategory = (id: number, data: Partial<Category>) =>
  http.put(`/api/admin/question-categories/${id}`, data)
export const deleteCategory = (id: number) => http.del(`/api/admin/question-categories/${id}`)

// ---------- 题目 ----------
export interface QuestionQuery {
  page?: number
  size?: number
  bankId?: number
  categoryId?: number
  type?: string
  status?: number
  keyword?: string
}
export const fetchQuestions = (params: QuestionQuery) =>
  http.get<PageResult<Question>>('/api/admin/questions', params as unknown as Record<string, string | number | undefined>)
export const createQuestion = (data: QuestionPayload) => http.post<{ id: number }>('/api/admin/questions', data)
export const updateQuestion = (id: number, data: QuestionPayload) => http.put(`/api/admin/questions/${id}`, data)
export const deleteQuestion = (id: number) => http.del(`/api/admin/questions/${id}`)

/** 批量导入结果 */
export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: Array<{ row: number; reason: string }>
}
/** Excel/CSV 批量导入题目（multipart 上传） */
export const importQuestions = (bankId: number, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api<ImportResult>('/api/admin/questions/import', { method: 'POST', body: fd, params: { bankId } })
}

// ---------- 考试 ----------
export const fetchExams = () => http.get<Exam[]>('/api/admin/exams')
export const createExam = (data: ExamPayload) => http.post<{ id: number }>('/api/admin/exams', data)
export const updateExam = (id: number, data: ExamPayload) => http.put(`/api/admin/exams/${id}`, data)
export const deleteExam = (id: number) => http.del(`/api/admin/exams/${id}`)
export const fetchExamDetail = (id: number) => http.get<ExamDetail>(`/api/admin/exams/${id}`)

// ---------- 考试记录 ----------
export const fetchExamRecords = (params: { examId?: number; page?: number; size?: number }) =>
  http.get<PageResult<ExamRecord>>('/api/admin/exam-records', params)

// ---------- 用户 ----------
export const fetchUsers = (params: { page?: number; size?: number; keyword?: string }) =>
  http.get<PageResult<{
    id: number; nickname: string; status: number; answered: number
    accuracy: number; exams: number; lastLoginAt: string | null; createdAt: string
  }>>('/api/admin/users', params)

// ---------- 统计 ----------
export const fetchStats = () => http.get<AdminStats>('/api/admin/stats')
