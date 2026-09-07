import { defineHandler } from 'nitro/h3'
import { requireUser, numParam } from '../../utils/auth'
import { query } from '../../utils/db'

/** 取消收藏 */
export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const questionId = numParam(event)
  await query(
    'DELETE FROM user_favorite_question WHERE user_id = $1 AND question_id = $2',
    [user.uid, questionId]
  )
  return { ok: true }
})
