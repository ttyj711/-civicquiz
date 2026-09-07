import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, numParam } from '../../../utils/auth'
import { query, tx } from '../../../utils/db'

/** 删除分类（有子分类或启用题目时禁止删除 → 只能禁用 status=0） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const id = numParam(event)

  const used = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM question_category WHERE parent_id = $1) AS children,
       (SELECT COUNT(*)::int FROM question q WHERE q.category_id = $1 AND q.status = 1) AS questions`,
    [id]
  )
  if (used.rows[0].children > 0 || used.rows[0].questions > 0) {
    throw createError({ statusCode: 400, message: '分类下存在子分类或启用题目，请先迁移/禁用' })
  }

  await tx(async (client) => {
    // 物理删除该分类下已软删题目与自身
    await client.query('UPDATE question SET category_id = NULL WHERE category_id = $1', [id])
    const r = await client.query('DELETE FROM question_category WHERE id = $1 RETURNING id', [id])
    if (!r.rows[0]) throw createError({ statusCode: 404, message: '分类不存在' })
  })
  return { ok: true }
})
