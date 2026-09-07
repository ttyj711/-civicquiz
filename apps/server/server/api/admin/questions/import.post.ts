import { defineHandler, createError, getQuery, readMultipartFormData } from 'nitro/h3'
import * as XLSX from 'xlsx'
import { requireAdmin } from '../../../utils/auth'
import { tx } from '../../../utils/db'

/**
 * 题库批量导入（Excel / CSV）。
 * 表头约定（首行）：题干 | 题型 | 选项A..选项F | 答案 | 解析 | 难度 | 分值 | 分类
 * - 题型：单选 / 多选 / 判断（留空默认单选）
 * - 答案：选择题写字母（如 A 或 ABD）；判断题写 正确/错误（兼容 对/错、√/×、TRUE/FALSE）
 * - 分类：按名称匹配同题库分类，不存在时自动创建
 * 策略：逐行独立事务，失败行跳过并记录原因，其余正常入库。
 */

interface ParsedRow {
  row: number
  content: string
  type: 'SINGLE' | 'MULTIPLE' | 'JUDGE'
  options: Array<{ key: string; content: string }>
  answerKeys: string[]
  analysis: string | null
  difficulty: number
  score: number
  categoryName: string | null
}

const JUDGE_TRUE = new Set(['对', '正确', '是', '√', 't', 'true', 'y', 'yes', 'a'])
const JUDGE_FALSE = new Set(['错', '错误', '否', '×', 'x', 'f', 'false', 'n', 'no', 'b'])
const OPT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

/** 归一化题型中文/英文描述 */
function parseType(raw: string): 'SINGLE' | 'MULTIPLE' | 'JUDGE' {
  const s = raw.trim().toLowerCase()
  if (!s) return 'SINGLE'
  if (s.includes('判') || s === 'judge' || s === 'bool') return 'JUDGE'
  if (s.includes('多') || s.includes('multiple')) return 'MULTIPLE'
  return 'SINGLE'
}

/** 判断题答案归一化：TRUE / FALSE，无法识别返回 null */
function parseJudgeAnswer(raw: string): 'TRUE' | 'FALSE' | null {
  const s = raw.trim().toLowerCase()
  if (JUDGE_TRUE.has(s)) return 'TRUE'
  if (JUDGE_FALSE.has(s)) return 'FALSE'
  return null
}

/** 从工作表中解析并校验所有行，返回可入库行与错误明细 */
function parseSheet(buf: Buffer): { rows: ParsedRow[]; errors: Array<{ row: number; reason: string }> } {
  const wb = XLSX.read(buf, { type: 'buffer', codepage: 936 })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw createError({ statusCode: 400, message: '文件中没有工作表' })
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  if (raw.length === 0) throw createError({ statusCode: 400, message: '文件中没有数据行' })
  if (raw.length > 2000) throw createError({ statusCode: 400, message: '单次最多导入 2000 题' })

  const rows: ParsedRow[] = []
  const errors: Array<{ row: number; reason: string }> = []

  raw.forEach((rec, idx) => {
    const rowNo = idx + 2 // 表头占第 1 行
    // 列名兼容：忽略首尾空格；选项列兼容 "A" / "选项A" 两种写法
    const get = (...names: string[]) => {
      for (const n of names) {
        const hit = Object.keys(rec).find((k) => k.trim() === n)
        if (hit !== undefined && String(rec[hit] ?? '').trim() !== '') return String(rec[hit]).trim()
      }
      return ''
    }

    const content = get('题干', '题目', '题干内容')
    if (!content) {
      errors.push({ row: rowNo, reason: '题干为空' })
      return
    }
    const type = parseType(get('题型', '类型'))
    const answerRaw = get('答案', '正确答案')
    if (!answerRaw) {
      errors.push({ row: rowNo, reason: '答案为空' })
      return
    }

    const options: ParsedRow['options'] = []
    let answerKeys: string[] = []

    if (type === 'JUDGE') {
      options.push({ key: 'TRUE', content: '正确' }, { key: 'FALSE', content: '错误' })
      const j = parseJudgeAnswer(answerRaw)
      if (!j) {
        errors.push({ row: rowNo, reason: `判断题答案无法识别: "${answerRaw}"（应写 正确/错误）` })
        return
      }
      answerKeys = [j]
    } else {
      for (let i = 0; i < OPT_KEYS.length; i++) {
        const v = get(`选项${OPT_KEYS[i]}`, OPT_KEYS[i])
        if (v) options.push({ key: OPT_KEYS[i], content: v })
      }
      if (options.length < 2) {
        errors.push({ row: rowNo, reason: '有效选项不足 2 个' })
        return
      }
      answerKeys = answerRaw.toUpperCase().replace(/[^A-F]/g, '').split('').filter((k, i, arr) => arr.indexOf(k) === i)
      if (answerKeys.length === 0) {
        errors.push({ row: rowNo, reason: `答案 "${answerRaw}" 中未找到有效选项字母` })
        return
      }
      const missing = answerKeys.filter((k) => !options.some((o) => o.key === k))
      if (missing.length) {
        errors.push({ row: rowNo, reason: `答案引用了不存在的选项 ${missing.join('/')}` })
        return
      }
      if (type === 'SINGLE' && answerKeys.length > 1) {
        errors.push({ row: rowNo, reason: '单选题答案只能有一个字母' })
        return
      }
      if (type === 'MULTIPLE' && answerKeys.length < 2) {
        errors.push({ row: rowNo, reason: '多选题答案至少两个字母' })
        return
      }
    }

    const difficultyRaw = Number(get('难度')) || 2
    const scoreRaw = Number(get('分值', '分数')) || 2
    rows.push({
      row: rowNo,
      content,
      type,
      options,
      answerKeys,
      analysis: get('解析', '答案解析') || null,
      difficulty: Math.min(5, Math.max(1, Math.round(difficultyRaw))),
      score: Math.min(100, Math.max(1, Math.round(scoreRaw))),
      categoryName: get('分类', '分类名') || null,
    })
  })

  return { rows, errors }
}

export default defineHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const bankId = Number(q.bankId)
  if (!bankId) throw createError({ statusCode: 400, message: '缺少 bankId' })

  const parts = await readMultipartFormData(event)
  if (!parts?.length) throw createError({ statusCode: 400, message: '未收到上传文件' })
  const file = parts.find((p) => p.name === 'file' || p.filename)
  if (!file?.data?.length) throw createError({ statusCode: 400, message: '未收到上传文件' })
  const name = (file.filename || '').toLowerCase()
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
    throw createError({ statusCode: 400, message: '仅支持 .xlsx / .xls / .csv 文件' })
  }

  const { rows, errors } = parseSheet(Buffer.from(file.data))

  // 分类名 -> id 缓存（同题库内复用，缺失时自动创建）
  const catCache = new Map<string, number>()
  const resolveCategory = async (client: import('pg').PoolClient, name: string): Promise<number | null> => {
    if (catCache.has(name)) return catCache.get(name)!
    const found = await client.query(
      'SELECT id FROM question_category WHERE bank_id = $1 AND name = $2 LIMIT 1',
      [bankId, name]
    )
    if (found.rows[0]) {
      catCache.set(name, found.rows[0].id)
      return found.rows[0].id
    }
    const created = await client.query(
      'INSERT INTO question_category (bank_id, name, sort) VALUES ($1, $2, 0) RETURNING id',
      [bankId, name]
    )
    catCache.set(name, created.rows[0].id)
    return created.rows[0].id
  }

  let success = 0
  for (const r of rows) {
    try {
      await tx(async (client) => {
        let categoryId: number | null = null
        if (r.categoryName) categoryId = await resolveCategory(client, r.categoryName)
        const qres = await client.query(
          `INSERT INTO question (bank_id, category_id, type, content, analysis, difficulty, score, status, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 'IMPORT') RETURNING id`,
          [bankId, categoryId, r.type, r.content, r.analysis, r.difficulty, r.score]
        )
        const questionId = qres.rows[0].id as number
        const optIds: Record<string, number> = {}
        for (let i = 0; i < r.options.length; i++) {
          const o = await client.query(
            'INSERT INTO question_option (question_id, option_key, content, sort) VALUES ($1, $2, $3, $4) RETURNING id',
            [questionId, r.options[i].key, r.options[i].content, i]
          )
          optIds[r.options[i].key] = o.rows[0].id
        }
        for (const k of r.answerKeys) {
          await client.query(
            'INSERT INTO question_answer (question_id, option_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [questionId, optIds[k]]
          )
        }
      })
      success++
    } catch (e) {
      errors.push({ row: r.row, reason: `写入失败: ${(e as Error).message}` })
    }
  }

  // 刷新题库计数（一次性）
  await tx(async (client) => {
    await client.query(
      'UPDATE question_bank SET question_count = (SELECT COUNT(*) FROM question WHERE bank_id = $1) WHERE id = $1',
      [bankId]
    )
  })

  return {
    total: rows.length + errors.filter((e) => !e.reason.startsWith('写入失败')).length,
    success,
    failed: errors.length,
    errors: errors.slice(0, 50),
  }
})
