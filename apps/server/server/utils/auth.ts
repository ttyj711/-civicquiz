import { createError } from 'nitro/h3'
import { getRequestHeader, getRouterParam, type H3Event } from 'nitro/h3'
import { verifyToken, type AdminPayload, type UserPayload } from './jwt'

function bearer(event: H3Event): string | null {
  const h = getRequestHeader(event, 'authorization')
  return h?.startsWith('Bearer ') ? h.slice(7) : null
}

/** 普通用户鉴权（小程序端） */
export async function requireUser(event: H3Event): Promise<UserPayload> {
  const token = bearer(event)
  if (!token) throw createError({ statusCode: 401, message: '未登录' })
  const payload = await verifyToken<UserPayload>(token)
  if (!payload || payload.typ !== 'user') throw createError({ statusCode: 401, message: '登录已失效' })
  return payload
}

/** 管理员鉴权（后台） */
export async function requireAdmin(event: H3Event): Promise<AdminPayload> {
  const token = bearer(event)
  if (!token) throw createError({ statusCode: 401, message: '未登录' })
  const payload = await verifyToken<AdminPayload>(token)
  if (!payload || payload.typ !== 'admin') throw createError({ statusCode: 401, message: '无管理员权限' })
  return payload
}

/** 解析路由数字参数 */
export function numParam(event: H3Event, name = 'id'): number {
  const v = Number(getRouterParam(event, name))
  if (!Number.isInteger(v) || v <= 0) throw createError({ statusCode: 400, message: '参数非法' })
  return v
}

/** 解析 JSON body（POST/PUT） */
export async function readJson<T = Record<string, unknown>>(event: H3Event): Promise<T> {
  try {
    return (await event.req.json()) as T
  } catch {
    throw createError({ statusCode: 400, message: '请求体必须是 JSON' })
  }
}
