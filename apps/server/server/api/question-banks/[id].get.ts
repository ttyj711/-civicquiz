import { defineHandler, createError } from 'nitro/h3'
import { requireUser, numParam } from '../../utils/auth'
import { query } from '../../utils/db'

export default defineHandler(async (event) => {
  await requireUser(event)
  const id = numParam(event)
  const r = await query(
    `SELECT b.id, b.name, b.description, b.cover_url,
            (SELECT COUNT(*)::int FROM question q WHERE q.bank_id = b.id AND q.status = 1) AS question_count
     FROM question_bank b WHERE b.id = $1 AND b.status = 1`,
    [id]
  )
  if (!r.rows[0]) throw createError({ statusCode: 404, message: '题库不存在' })
  const bank = r.rows[0]

  const cats = await query<CatRow>(
    `SELECT id, parent_id, name FROM question_category WHERE bank_id = $1 AND status = 1 ORDER BY sort, id`,
    [id]
  )
  return { ...bank, categories: buildTree(cats.rows) }
})

interface CatRow { id: number; parent_id: number; name: string }
interface CatNode { id: number; parentId: number; name: string; children: CatNode[] }

function buildTree(rows: CatRow[]): CatNode[] {
  const map = new Map<number, CatNode>()
  for (const r of rows) map.set(r.id, { id: r.id, parentId: r.parent_id, name: r.name, children: [] })
  const roots: CatNode[] = []
  for (const node of map.values()) {
    const parent = map.get(node.parentId)
    if (parent && parent !== node) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}
