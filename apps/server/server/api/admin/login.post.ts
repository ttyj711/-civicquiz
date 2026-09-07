import { defineHandler, createError } from 'nitro/h3'
import bcrypt from 'bcryptjs'
import { readJson } from '../../utils/auth'
import { signToken } from '../../utils/jwt'
import { query } from '../../utils/db'

interface AdminLoginBody {
  username?: string
  password?: string
}

export default defineHandler(async (event) => {
  const body = await readJson<AdminLoginBody>(event)
  if (!body.username || !body.password) throw createError({ statusCode: 400, message: '用户名或密码为空' })

  const r = await query(
    'SELECT id, username, password_hash, nickname, status FROM sys_admin WHERE username = $1',
    [body.username]
  )
  const admin = r.rows[0]
  if (!admin || admin.status !== 1) throw createError({ statusCode: 401, message: '账号不存在或已禁用' })
  if (!bcrypt.compareSync(body.password, admin.password_hash)) {
    throw createError({ statusCode: 401, message: '用户名或密码错误' })
  }
  await query('UPDATE sys_admin SET last_login_at = now() WHERE id = $1', [admin.id])

  const token = await signToken({ aid: admin.id, username: admin.username, typ: 'admin' })
  return { token, admin: { id: admin.id, username: admin.username, nickname: admin.nickname } }
})
