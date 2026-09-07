// 轻量 fetch 封装：自动带 token、统一错误处理
const TOKEN_KEY = 'civicquiz_admin_token'
const BASE = import.meta.env.VITE_API_BASE || ''

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface Opts {
  method?: string
  body?: unknown
  params?: Record<string, string | number | undefined>
}

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  let url = BASE + path
  if (opts.params) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v))
    }
    const s = qs.toString()
    if (s) url += '?' + s
  }
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  // FormData（文件上传）交由浏览器自动设置 Content-Type 与 boundary
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData
  if (!isForm) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body === undefined
      ? undefined
      : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
  })
  if (res.status === 401 && !path.startsWith('/api/admin/login')) {
    clearToken()
    location.href = '/login'
    throw new ApiError(401, '登录已失效，请重新登录')
  }
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* 非 JSON 直接抛错 */
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : '') || `请求失败(${res.status})`
    throw new ApiError(res.status, msg)
  }
  return data as T
}

// 便捷方法
export const http = {
  get: <T>(path: string, params?: Opts['params']) => api<T>(path, { params }),
  post: <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => api<T>(path, { method: 'PUT', body }),
  del: <T>(path: string) => api<T>(path, { method: 'DELETE' }),
}
