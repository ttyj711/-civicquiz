import { defineErrorHandler } from 'nitro'

/**
 * 统一错误响应格式：{ error: true, message }
 * - 4xx 业务错误：返回明确 message，前端可直接 toast 展示
 * - 5xx 服务端错误：生产环境隐藏内部细节（避免泄露堆栈与路径），仅在服务端记录日志
 */
export default defineErrorHandler((error, event) => {
  const status = (error as { statusCode?: number; status?: number }).statusCode
    ?? (error as { status?: number }).status
    ?? 500
  const isProd = process.env.NODE_ENV === 'production'
  const message = status >= 500 && isProd
    ? '服务器内部错误，请稍后重试'
    : (error as Error).message || '请求失败'

  if (status >= 500) {
    const url = (event as { req?: { url?: string } })?.req?.url ?? ''
    console.error(`[api:error] ${status} ${url}`, error)
  }

  return new Response(JSON.stringify({ error: true, message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
})
