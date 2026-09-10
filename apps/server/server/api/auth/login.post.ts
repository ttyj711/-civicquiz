import { defineHandler, createError } from 'nitro/h3'
import { z } from 'zod'
import { loginSchema } from '@civicquiz/shared'
import { code2session } from '../../utils/wechat'
import { signToken } from '../../utils/jwt'
import { query, tx } from '../../utils/db'
import { readValidated } from '../../utils/validate'

/** 复用 shared 的 code 校验，扩展可选的昵称/头像 */
const loginBodySchema = loginSchema.extend({
  nickname: z.string().max(64).optional(),
  avatarUrl: z.string().max(512).optional(),
})

export default defineHandler(async (event) => {
  const body = await readValidated(event, loginBodySchema)

  const session = await code2session(body.code)

  const user = await tx(async (client) => {
    const existing = await client.query(
      'SELECT id, openid, nickname, avatar_url, status FROM sys_user WHERE openid = $1',
      [session.openid]
    )
    let row = existing.rows[0]
    if (!row) {
      const inserted = await client.query(
        `INSERT INTO sys_user (openid, unionid, nickname, avatar_url, last_login_at)
         VALUES ($1, $2, $3, $4, now()) RETURNING id, openid, nickname, avatar_url, status`,
        [session.openid, session.unionid ?? null, body.nickname ?? `用户${Date.now() % 100000}`, body.avatarUrl ?? null]
      )
      row = inserted.rows[0]
    } else {
      await client.query('UPDATE sys_user SET last_login_at = now() WHERE id = $1', [row.id])
    }
    if (row.status !== 1) throw createError({ statusCode: 403, message: '账号已被禁用' })
    return row
  })

  const token = await signToken({ uid: user.id, openid: user.openid, typ: 'user' })
  return { token, user: { id: user.id, nickname: user.nickname, avatarUrl: user.avatar_url } }
})
