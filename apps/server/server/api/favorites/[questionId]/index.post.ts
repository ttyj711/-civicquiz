import { defineHandler } from 'nitro/h3'
import { requireUser, numParam } from '../../utils/auth'
import { query } from '../../utils/db'

/** 收藏题目（幂等） */
export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const questionId = numParam(event)
  await query(
    `INSERT INTO user_favorite_question (user_id, question_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, question_id) DO NOTHING`,
    [user.uid, questionId]
  )
  return { ok: true }
})
