import Taro from '@tarojs/taro'

// 基址：优先取 .env 注入的 TARO_APP_API；本地联调默认走本机 3000（微信开发者工具中调试可用）
const BASE = process.env.TARO_APP_API || 'http://127.0.0.1:3000'
const TOKEN_KEY = 'civicquiz_miniapp_token'

export function getToken(): string | null {
  return Taro.getStorageSync<string>(TOKEN_KEY) || null
}
export function setToken(t: string) {
  Taro.setStorageSync(TOKEN_KEY, t)
}
export function clearToken() {
  Taro.removeStorageSync(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface Opts {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | undefined>
}

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  let url = BASE + path
  if (opts.params) {
    const qs = Object.entries(opts.params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    if (qs) url += '?' + qs
  }

  const header: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) header.Authorization = `Bearer ${token}`

  const res = await Taro.request({
    url,
    method: opts.method || 'GET',
    data: opts.body as Record<string, unknown> | undefined,
    header,
    timeout: 15000,
  })

  const st = res.statusCode
  if (st === 401 && !path.startsWith('/api/auth/login')) {
    clearToken()
    throw new ApiError(401, '登录已失效')
  }
  const data = res.data as { message?: string } | T
  if (st < 200 || st >= 300) {
    const msg = (data && typeof data === 'object' && 'message' in (data as object)
      ? String((data as { message?: unknown }).message)
      : '') || `请求失败(${st})`
    throw new ApiError(st, msg)
  }
  return data as T
}
