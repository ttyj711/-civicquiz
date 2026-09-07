import { defineHandler } from 'nitro/h3'
import { requireUser } from '../../utils/auth'
import { query } from '../../utils/db'

export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const r = await query(
    'SELECT id, nickname, avatar_url, status, created_at FROM sys_user WHERE id = $1',
    [user.uid]
  )
  const row = r.rows[0]
  return { id: row.id, nickname: row.nickname, avatarUrl: row.avatar_url, createdAt: row.created_at }
})
