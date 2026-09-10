import { createError, type H3Event } from 'nitro/h3'
import type { ZodType } from 'zod'
import { readJson } from './auth'

/** 校验失败时抛出统一的 400 错误（取第一条 issue，便于前端直接展示） */
function fail(issues: { path: (string | number)[]; message: string }[] | undefined, fallback: string) {
  const first = issues?.[0]
  const field = first?.path.join('.') || fallback
  throw createError({
    statusCode: 400,
    message: `参数校验失败：${field} ${first?.message ?? '不合法'}`,
  })
}

/** 请求体校验：解析 JSON 并交给 zod schema 校验 */
export async function readValidated<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const body = await readJson(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) fail(parsed.error.issues, 'body')
  return parsed.data as T
}

/** query 参数校验（GET 请求） */
export function validateQuery<T>(raw: unknown, schema: ZodType<T>): T {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) fail(parsed.error.issues, 'query')
  return parsed.data as T
}
